// Netlify event-triggered function: runs automatically on every verified Netlify Forms
// submission for this site (the function name `submission-created` is what wires it up).
//
// For dealer-intent forms (dealer-application, territory-check, and the contact form's
// "Dealer Partnership Inquiry" topic) it:
//   1. creates/updates the HubSpot contact + company and opens a Dealer Acquisition deal
//      (New Prospect) with a note holding the full submission and a same-day call task;
//   2. emails the prospect from Ben's mailbox promising a call later today / next business
//      morning (BCC'd to the HubSpot logging address so it lands on the timeline);
//   3. emails the team an alert with the HubSpot record links.
//
// Every step is independent: a HubSpot outage never blocks the auto-reply and vice versa.
// Netlify's own form notifications (Site settings → Forms → Notifications) keep working.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   HUBSPOT_PRIVATE_APP_TOKEN   required for the CRM sync (private app, CRM contacts/companies/deals read+write)
//   HUBSPOT_API_BASE            optional, default https://api.hubapi.com
//   HUBSPOT_PORTAL_ID           optional, default 244107450
//   HUBSPOT_UI_DOMAIN           optional, default app-na2.hubspot.com
//   HUBSPOT_DEALER_PIPELINE_ID / HUBSPOT_NEW_PROSPECT_STAGE_ID / HUBSPOT_CLOSED_STAGE_IDS  optional overrides
//   HUBSPOT_BCC_ADDRESS         optional, the portal's email-logging BCC address
//   LEAD_DEFAULT_OWNER_ID       optional, default Ben (84039521)
//   LEAD_OWNER_BY_STATE         optional JSON, e.g. {"AZ":"160712108","OR":"160712575"}
//   SMTP_USER / SMTP_PASS       Google Workspace mailbox + app password (enables both emails)
//   SMTP_HOST / SMTP_PORT / MAIL_FROM / MAIL_FROM_NAME / MAIL_REPLY_TO   optional mail overrides
//   LEAD_ALERT_TO               optional comma list for the internal alert, e.g. ben@…,gillian@…
//   AUTO_REPLY_DISABLED=1       optional, keeps the CRM sync but skips the prospect email
//   DRY_RUN=1                   optional, logs what would happen without calling HubSpot or SMTP

import { normalizeLead, leadSummaryLines } from './leads.mjs';
import { HubSpotClient, syncLeadToHubSpot } from './hubspot.mjs';
import { nextTouch, prospectEmail, internalAlert } from './copy.mjs';
import { createMailer, sendMail } from './mail.mjs';
import { createDryRunFetch } from './dryrun.mjs';
import { HUBSPOT_DEFAULTS, routeFor } from './mapping.mjs';

const log = (...args) => console.log('[dealer-lead]', ...args);
const warn = (...args) => console.warn('[dealer-lead]', ...args);

function parseEventBody(event) {
  if (!event) return null;
  if (typeof event.body === 'string') {
    try { return JSON.parse(event.body); } catch { return null; }
  }
  return event.body && typeof event.body === 'object' ? event.body : null;
}

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

/**
 * Core routine, exported so it can be unit-tested with an injected environment/fetch.
 * @param {object} payload   Netlify submission payload
 * @param {object} [opts]
 * @param {object} [opts.env]
 * @param {Date}   [opts.now]
 * @param {Function} [opts.fetchImpl]
 * @param {object} [opts.mailer]
 */
export async function processSubmission(payload, { env = process.env, now = new Date(), fetchImpl, mailer } = {}) {
  const lead = normalizeLead(payload);
  if (!lead) {
    return { skipped: true, reason: `form "${payload?.form_name || 'unknown'}" is not a dealer lead (or has no valid email)` };
  }
  lead.route = routeFor(lead);

  const touch = nextTouch(now);
  const summary = leadSummaryLines(lead);
  const outcome = { skipped: false, form: lead.form, route: lead.route, email: lead.email, touch: touch.phrase, hubspot: null, prospectEmail: null, alertEmail: null, errors: [] };
  log(`lead received: ${lead.formLabel} from ${lead.email} (${lead.company || 'no company'}, ${lead.city || '?'}, ${lead.state || '?'}); route ${lead.route}; touch ${touch.phrase}`);

  // --- HubSpot -------------------------------------------------------------
  const dryRun = env.DRY_RUN === '1';
  const token = env.HUBSPOT_PRIVATE_APP_TOKEN || (dryRun ? 'dry-run-token' : '');
  if (token) {
    try {
      const client = new HubSpotClient({
        token,
        apiBase: env.HUBSPOT_API_BASE || HUBSPOT_DEFAULTS.apiBase,
        fetchImpl: fetchImpl || (dryRun ? createDryRunFetch().fetchImpl : globalThis.fetch),
        log,
      });
      outcome.hubspot = await syncLeadToHubSpot(client, lead, { dueAt: touch.dueAt, touchPhrase: touch.phrase, env, log });
      log(`hubspot ok: contact ${outcome.hubspot.contactId}, deal ${outcome.hubspot.dealId || 'none'}${outcome.hubspot.dealReused ? ' (reused)' : ''}, task ${outcome.hubspot.taskId || 'none'}`);
    } catch (err) {
      outcome.errors.push(`hubspot: ${err.message}`);
      warn(`hubspot sync failed: ${err.message}`);
    }
  } else {
    outcome.errors.push('hubspot: HUBSPOT_PRIVATE_APP_TOKEN not set — sync skipped');
    warn('HUBSPOT_PRIVATE_APP_TOKEN not set; skipping CRM sync');
  }

  // --- Email ---------------------------------------------------------------
  const mail = mailer === undefined ? createMailer(env) : mailer;
  if (!mail) {
    outcome.errors.push('mail: SMTP_USER/SMTP_PASS not set — emails skipped');
    warn('SMTP not configured; skipping prospect auto-reply and internal alert');
    return outcome;
  }

  if (env.AUTO_REPLY_DISABLED === '1') {
    log('AUTO_REPLY_DISABLED=1; skipping prospect email');
  } else {
    try {
      const msg = prospectEmail(lead, touch, env);
      const info = await sendMail(mail, {
        to: lead.name ? { name: lead.name, address: lead.email } : lead.email,
        bcc: env.HUBSPOT_BCC_ADDRESS || undefined,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        tag: `prospect-${lead.form}`,
      });
      outcome.prospectEmail = { to: lead.email, subject: msg.subject, messageId: info?.messageId || null, dryRun: !!mail.dryRun };
      log(`prospect email ${mail.dryRun ? '(dry run) ' : ''}sent to ${lead.email}: "${msg.subject}"`);
    } catch (err) {
      outcome.errors.push(`prospect email: ${err.message}`);
      warn(`prospect email failed: ${err.message}`);
    }
  }

  const alertTo = (env.LEAD_ALERT_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (alertTo.length) {
    try {
      const msg = internalAlert(lead, outcome.hubspot, touch, summary);
      const info = await sendMail(mail, { to: alertTo, subject: msg.subject, text: msg.text, html: msg.html, tag: 'internal-alert' });
      outcome.alertEmail = { to: alertTo, subject: msg.subject, messageId: info?.messageId || null, dryRun: !!mail.dryRun };
      log(`internal alert ${mail.dryRun ? '(dry run) ' : ''}sent to ${alertTo.join(', ')}`);
    } catch (err) {
      outcome.errors.push(`internal alert: ${err.message}`);
      warn(`internal alert failed: ${err.message}`);
    }
  }

  return outcome;
}

export const handler = async (event) => {
  const body = parseEventBody(event);
  const payload = body?.payload;
  if (!payload) {
    warn('no payload on event; ignoring');
    return respond(400, { error: 'missing payload' });
  }
  try {
    const outcome = await processSubmission(payload);
    // Never hand Netlify a non-2xx for a handled lead: the submission itself already succeeded.
    return respond(200, outcome);
  } catch (err) {
    warn(`unhandled error: ${err.stack || err.message}`);
    return respond(200, { skipped: false, errors: [`unhandled: ${err.message}`] });
  }
};
// Note: no default export on purpose — a default export would make Netlify treat this file
// as a Functions 2.0 (Request/Response) function instead of a classic event handler.
