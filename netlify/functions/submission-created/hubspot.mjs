// Thin HubSpot CRM v3/v4 client (fetch-based, no SDK) plus the lead → CRM sync.
// Auth: a HubSpot private-app token in HUBSPOT_PRIVATE_APP_TOKEN with scopes
//   crm.objects.contacts.read/write, crm.objects.companies.read/write,
//   crm.objects.deals.read/write, crm.objects.owners.read (optional), and
//   crm.schemas.* are NOT needed. Notes/tasks use the contacts/deals write scopes.

import {
  HUBSPOT_DEFAULTS,
  dealerTypeFor,
  ownerForState,
  primaryBrandFocusFor,
  recordUrl,
  regionFor,
  unavailableBrands,
} from './mapping.mjs';
import { domainFromEmail, domainFromUrl, leadSummaryLines } from './leads.mjs';

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export class HubSpotClient {
  /**
   * @param {object} opts
   * @param {string} opts.token
   * @param {string} [opts.apiBase]
   * @param {Function} [opts.fetchImpl]   Injectable fetch for tests / dry runs.
   * @param {Function} [opts.log]
   */
  constructor({ token, apiBase = HUBSPOT_DEFAULTS.apiBase, fetchImpl = globalThis.fetch, log = () => {} }) {
    if (!token) throw new Error('HubSpotClient: missing token');
    this.token = token;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.log = log;
  }

  async request(method, path, body, { allow404 = false, attempt = 1 } = {}) {
    const url = `${this.apiBase}${path}`;
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 404 && allow404) return null;
    if (res.status === 204) return {};

    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

    if (res.ok) return json;

    if (RETRYABLE.has(res.status) && attempt < 3) {
      const retryAfter = Number(res.headers?.get?.('Retry-After')) || 0;
      const waitMs = retryAfter ? retryAfter * 1000 : 400 * attempt * attempt;
      this.log(`hubspot ${method} ${path} → ${res.status}; retrying in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      return this.request(method, path, body, { allow404, attempt: attempt + 1 });
    }

    const message = json?.message || json?.raw || text || res.statusText;
    const err = new Error(`HubSpot ${method} ${path} failed (${res.status}): ${message}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  // ---- Contacts -----------------------------------------------------------

  async getContactByEmail(email) {
    const props = 'firstname,lastname,lifecyclestage,hs_lead_status,hubspot_owner_id,company';
    return this.request(
      'GET',
      `/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=${props}`,
      undefined,
      { allow404: true },
    );
  }

  createContact(properties) {
    return this.request('POST', '/crm/v3/objects/contacts', { properties });
  }

  updateContact(id, properties) {
    return this.request('PATCH', `/crm/v3/objects/contacts/${id}`, { properties });
  }

  // ---- Companies ----------------------------------------------------------

  async findCompany({ domain, name }) {
    const groups = [];
    if (domain) groups.push({ filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }] });
    if (name) groups.push({ filters: [{ propertyName: 'name', operator: 'EQ', value: name }] });
    if (!groups.length) return null;
    const res = await this.request('POST', '/crm/v3/objects/companies/search', {
      filterGroups: groups,
      properties: ['name', 'domain', 'dealer_status', 'hubspot_owner_id'],
      limit: 5,
    });
    const results = res?.results || [];
    // Prefer the domain match when both were searched.
    const byDomain = domain ? results.find((r) => (r.properties?.domain || '').toLowerCase() === domain) : null;
    return byDomain || results[0] || null;
  }

  createCompany(properties) {
    return this.request('POST', '/crm/v3/objects/companies', { properties });
  }

  // ---- Deals --------------------------------------------------------------

  /**
   * An open deal in the pipeline for the same company, the same contact, or with the same
   * name. Matching on the associations means a territory check followed by an application
   * (different deal names) stays ONE deal instead of double-counting the funnel.
   */
  async findOpenDeal({ dealname, pipelineId, closedStageIds, companyId, contactId }) {
    const open = [
      { propertyName: 'pipeline', operator: 'EQ', value: pipelineId },
      { propertyName: 'dealstage', operator: 'NOT_IN', values: closedStageIds },
    ];
    const filterGroups = [];
    if (companyId) filterGroups.push({ filters: [{ propertyName: 'associations.company', operator: 'EQ', value: String(companyId) }, ...open] });
    if (contactId) filterGroups.push({ filters: [{ propertyName: 'associations.contact', operator: 'EQ', value: String(contactId) }, ...open] });
    filterGroups.push({ filters: [{ propertyName: 'dealname', operator: 'EQ', value: dealname }, ...open] });
    const res = await this.request('POST', '/crm/v3/objects/deals/search', {
      filterGroups,
      properties: ['dealname', 'dealstage', 'hubspot_owner_id'],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      limit: 1,
    });
    return res?.results?.[0] || null;
  }

  createDeal(properties) {
    return this.request('POST', '/crm/v3/objects/deals', { properties });
  }

  updateDeal(id, properties) {
    return this.request('PATCH', `/crm/v3/objects/deals/${id}`, { properties });
  }

  // ---- Engagements --------------------------------------------------------

  createNote(properties) {
    return this.request('POST', '/crm/v3/objects/notes', { properties });
  }

  createTask(properties) {
    return this.request('POST', '/crm/v3/objects/tasks', { properties });
  }

  // ---- Associations (default/unlabeled type) ------------------------------

  associate(fromType, fromId, toType, toId) {
    return this.request('PUT', `/crm/v4/objects/${fromType}/${fromId}/associations/default/${toType}/${toId}`);
  }
}

/** Safe wrapper: associations failing must never abort the sync. */
async function tryAssociate(client, log, fromType, fromId, toType, toId) {
  if (!fromId || !toId) return;
  try {
    await client.associate(fromType, fromId, toType, toId);
  } catch (err) {
    log(`association ${fromType}/${fromId} → ${toType}/${toId} failed: ${err.message}`);
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function dropEmpty(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

/**
 * Creates/updates the contact and company, opens (or reuses) a Dealer Acquisition deal,
 * logs a note with the full submission, and creates a same-day call task for the owner.
 *
 * @param {HubSpotClient} client
 * @param {object} lead        From normalizeLead()
 * @param {object} opts
 * @param {Date}   opts.dueAt  When the first touch is due (task timestamp)
 * @param {string} opts.touchPhrase  e.g. "later today"
 * @param {object} [opts.env]
 * @param {Function} [opts.log]
 */
export async function syncLeadToHubSpot(client, lead, { dueAt, touchPhrase, env = process.env, log = () => {} }) {
  const route = lead.route || 'pinnacle';
  const isEkd = route === 'ekd';
  // Pronorm leads outside the WW territory belong to EKD. Point them at an EKD pipeline when
  // one exists (EKD_DEAL_PIPELINE_ID + EKD_NEW_STAGE_ID); otherwise they stay in Dealer
  // Acquisition, clearly prefixed, so they never read as Pinnacle WW prospects.
  const ekdPipeline = isEkd && env.EKD_DEAL_PIPELINE_ID && env.EKD_NEW_STAGE_ID;
  const pipelineId = ekdPipeline ? env.EKD_DEAL_PIPELINE_ID : (env.HUBSPOT_DEALER_PIPELINE_ID || HUBSPOT_DEFAULTS.dealerAcquisitionPipelineId);
  const stageId = ekdPipeline ? env.EKD_NEW_STAGE_ID : (env.HUBSPOT_NEW_PROSPECT_STAGE_ID || HUBSPOT_DEFAULTS.newProspectStageId);
  const closedStageIds = ((ekdPipeline && env.EKD_CLOSED_STAGE_IDS) || env.HUBSPOT_CLOSED_STAGE_IDS || HUBSPOT_DEFAULTS.closedStageIds.join(','))
    .split(',').map((s) => s.trim()).filter(Boolean);
  const ownerId = route === 'pinnacle'
    ? ownerForState(lead.state, env)
    : String(env.EKD_OWNER_ID || env.LEAD_DEFAULT_OWNER_ID || HUBSPOT_DEFAULTS.owners.ben);
  const region = route === 'pinnacle' ? regionFor(lead.state, lead.city) : (lead.state ? { company: 'Other', deal: 'other' } : null);
  const summary = leadSummaryLines(lead);
  const result = { contactId: null, companyId: null, dealId: null, noteId: null, taskId: null, dealReused: false, urls: {}, warnings: [] };

  // 1) Contact -------------------------------------------------------------
  const existing = await client.getContactByEmail(lead.email);
  const contactProps = dropEmpty({
    email: lead.email,
    firstname: lead.firstName,
    lastname: lead.lastName,
    phone: lead.phone,
    company: lead.company,
    city: lead.city,
    state: lead.state,
    website: lead.website,
    cabinetry_line: lead.brands.join(', '),
    current_cabinet_brands: lead.currentLines,
    message: lead.message,
  });

  if (existing) {
    result.contactId = existing.id;
    const patch = { ...contactProps };
    delete patch.email;
    // Never move an existing contact backwards in lifecycle; only fill an empty lead status.
    if (!existing.properties?.hs_lead_status) patch.hs_lead_status = 'NEW';
    if (!existing.properties?.hubspot_owner_id) patch.hubspot_owner_id = ownerId;
    await client.updateContact(existing.id, patch);
    log(`contact ${existing.id} updated`);
  } else {
    const created = await client.createContact({
      ...contactProps,
      lifecyclestage: 'lead',
      hs_lead_status: 'NEW',
      hubspot_owner_id: ownerId,
    });
    result.contactId = created.id;
    log(`contact ${created.id} created`);
  }
  result.urls.contact = recordUrl('contacts', result.contactId, env);

  // 2) Company (only when we have something to key on) -----------------------
  const domain = domainFromUrl(lead.website) || domainFromEmail(lead.email);
  if (lead.company || domain) {
    try {
      const found = await client.findCompany({ domain, name: lead.company });
      if (found) {
        result.companyId = found.id;
        log(`company ${found.id} matched (${found.properties?.name || domain})`);
      } else {
        const company = await client.createCompany(dropEmpty({
          name: lead.company || domain,
          domain,
          city: lead.city,
          state: lead.stateName || lead.state,
          phone: lead.phone,
          website: lead.website,
          type: 'PROSPECT',
          dealer_status: 'Prospect',
          dealer_tier: 'Prospect',
          dealer_type: dealerTypeFor(lead.businessType),
          primary_brand_focus: primaryBrandFocusFor(lead.brands),
          region: region?.company,
          hubspot_owner_id: ownerId,
          description: `Website ${lead.formShortLabel} on ${lead.submittedAt.toISOString().slice(0, 10)}.` +
            (lead.businessType ? ` Business type: ${lead.businessType}.` : ''),
        }));
        result.companyId = company.id;
        log(`company ${company.id} created`);
      }
      result.urls.company = recordUrl('companies', result.companyId, env);
      await tryAssociate(client, log, 'contacts', result.contactId, 'companies', result.companyId);
    } catch (err) {
      result.warnings.push(`company step skipped: ${err.message}`);
      log(result.warnings.at(-1));
    }
  }

  // 3) Deal — one open deal per company/contact. Outside-territory WW-only asks get no deal:
  //    there is nothing Pinnacle can sell them, so they would only inflate the pipeline.
  const displayCompany = lead.company || lead.name || lead.email;
  const prefix = isEkd ? 'Pronorm (EKD) — ' : '';
  const dealname = lead.form === 'territory-check'
    ? `${prefix}${displayCompany} — Territory Check (${[lead.city, lead.state].filter(Boolean).join(', ') || 'location TBD'})`
    : `${prefix}${displayCompany} — Dealer Application`;

  const open = route === 'outside'
    ? null
    : await client.findOpenDeal({ dealname, pipelineId, closedStageIds, companyId: result.companyId, contactId: result.contactId });
  if (route === 'outside') {
    log('outside WW territory, WW-only interest: no deal opened');
  } else if (open) {
    result.dealId = open.id;
    result.dealReused = true;
    log(`deal ${open.id} reused`);
    // A territory check that turns into an application: name the deal for the stronger signal.
    if (lead.form !== 'territory-check' && /Territory Check/.test(open.properties?.dealname || '')) {
      try {
        await client.updateDeal(open.id, { dealname });
        log(`deal ${open.id} renamed to "${dealname}"`);
      } catch (err) {
        result.warnings.push(`deal rename skipped: ${err.message}`);
      }
    }
  } else {
    const closedate = new Date(lead.submittedAt.getTime() + 90 * 24 * 3600 * 1000);
    const deal = await client.createDeal(dropEmpty({
      dealname,
      pipeline: pipelineId,
      dealstage: stageId,
      deal_source: 'website',
      dealtype: 'newbusiness',
      region: region?.deal,
      hubspot_owner_id: ownerId,
      closedate: String(closedate.getTime()),
      description: summary.join('\n'),
    }));
    result.dealId = deal.id;
    log(`deal ${deal.id} created`);
  }
  if (result.dealId) {
    result.urls.deal = recordUrl('deals', result.dealId, env);
    await tryAssociate(client, log, 'deals', result.dealId, 'contacts', result.contactId);
    if (result.companyId) await tryAssociate(client, log, 'deals', result.dealId, 'companies', result.companyId);
  }

  // 4) Note with the full submission ----------------------------------------
  try {
    const note = await client.createNote({
      hs_timestamp: String(lead.submittedAt.getTime()),
      hs_note_body: `<p><strong>Website ${esc(lead.formLabel)}</strong></p><p>${summary.map(esc).join('<br>')}</p>`,
    });
    result.noteId = note.id;
    await tryAssociate(client, log, 'notes', note.id, 'contacts', result.contactId);
    if (result.dealId) await tryAssociate(client, log, 'notes', note.id, 'deals', result.dealId);
    if (result.companyId) await tryAssociate(client, log, 'notes', note.id, 'companies', result.companyId);
    log(`note ${note.id} created`);
  } catch (err) {
    result.warnings.push(`note skipped: ${err.message}`);
    log(result.warnings.at(-1));
  }

  // 5) Same-day call task for the owner -------------------------------------
  try {
    const who = [lead.name, lead.company].filter(Boolean).join(' · ') || lead.email;
    const canCall = Boolean(lead.phone);
    const missing = unavailableBrands(lead);
    const subject = route === 'outside'
      ? `Reply to ${who} — outside WW territory (${lead.state || 'state?'}) (${touchPhrase})`
      : `${canCall ? 'Call' : 'Email'} ${who} — website ${lead.formShortLabel}${isEkd ? ' (Pronorm/EKD)' : ''} (${touchPhrase})`;
    const task = await client.createTask({
      hs_timestamp: String(dueAt.getTime()),
      hs_task_subject: subject,
      hs_task_body: [
        route === 'outside'
          ? `Outside the WW Wood territory and asked only about ${missing.join(', ')}. They were told we would reply ${touchPhrase} with the right contact for their area and that Pronorm is available nationwide.`
          : `Prospect was told to expect ${canCall ? 'a call' : 'a reply'} ${touchPhrase}.`,
        isEkd && missing.length ? `Also asked about ${missing.join(', ')}, which are not available in ${lead.state}; they were told so.` : '',
        `Phone: ${lead.phone || '—'} · Email: ${lead.email}`,
        `Location: ${[lead.city, lead.state].filter(Boolean).join(', ') || '—'}`,
        lead.brands.length ? `Brands: ${lead.brands.join(', ')}` : '',
        lead.currentLines ? `Current lines: ${lead.currentLines}` : '',
        lead.message ? `Message: ${lead.message}` : '',
        `Source page: ${lead.sourcePage}`,
      ].filter(Boolean).join('\n'),
      hs_task_status: 'NOT_STARTED',
      hs_task_priority: 'HIGH',
      hs_task_type: canCall && route !== 'outside' ? 'CALL' : 'EMAIL',
      hubspot_owner_id: ownerId,
    });
    result.taskId = task.id;
    result.urls.task = recordUrl('tasks', task.id, env);
    await tryAssociate(client, log, 'tasks', task.id, 'contacts', result.contactId);
    if (result.dealId) await tryAssociate(client, log, 'tasks', task.id, 'deals', result.dealId);
    log(`task ${task.id} created`);
  } catch (err) {
    result.warnings.push(`task skipped: ${err.message}`);
    log(result.warnings.at(-1));
  }

  return result;
}
