// Timing rules and email copy for the dealer-lead auto-reply and the internal alert.
// Edit the text here; nothing else needs to change.

import { brandPagesFor, unavailableBrands, WW_STATE_NAMES_TEXT } from './mapping.mjs';

export const TIME_ZONE = 'America/Los_Angeles';

// Business hours in Pacific time. A lead that arrives before SAME_DAY_CUTOFF_HOUR on a
// business day is promised a call "later today"; anything later is promised first thing
// on the next business day.
export const SAME_DAY_CUTOFF_HOUR = 15; // 3:00 pm
export const SAME_DAY_DUE_HOUR = 17;    // task due 5:00 pm
export const NEXT_DAY_DUE_HOUR = 10;    // task due 10:00 am

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Wall-clock parts of `date` in the given IANA zone. */
export function zonedParts(date, timeZone = TIME_ZONE) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, weekday: 'short',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekdayIndex,
  };
}

/** UTC Date for a wall-clock time in `timeZone` (handles DST by two-pass offset correction). */
export function zonedTimeToUtc({ year, month, day, hour = 0, minute = 0 }, timeZone = TIME_ZONE) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (ms) => {
    const p = zonedParts(new Date(ms), timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - ms;
  };
  let utc = guess - offsetAt(guess);
  utc = guess - offsetAt(utc); // second pass catches a DST boundary between guess and result
  return new Date(utc);
}

function addDays({ year, month, day }, n) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekdayIndex: d.getUTCDay() };
}

/**
 * Decides what to promise the prospect and when the owner's task is due.
 * @returns {{ phrase: string, dueAt: Date, sameDay: boolean }}
 */
export function nextTouch(now = new Date(), timeZone = TIME_ZONE) {
  const p = zonedParts(now, timeZone);
  const isBusinessDay = p.weekdayIndex >= 1 && p.weekdayIndex <= 5;

  if (isBusinessDay && p.hour < SAME_DAY_CUTOFF_HOUR) {
    return {
      phrase: 'later today',
      sameDay: true,
      dueAt: zonedTimeToUtc({ year: p.year, month: p.month, day: p.day, hour: SAME_DAY_DUE_HOUR }, timeZone),
    };
  }

  let next = addDays(p, 1);
  while (next.weekdayIndex === 0 || next.weekdayIndex === 6) next = addDays(next, 1);
  const tomorrow = addDays(p, 1);
  const isTomorrow = next.day === tomorrow.day && next.month === tomorrow.month && next.year === tomorrow.year;
  return {
    phrase: isTomorrow ? 'first thing tomorrow morning' : `first thing ${WEEKDAYS[next.weekdayIndex]} morning`,
    sameDay: false,
    dueAt: zonedTimeToUtc({ year: next.year, month: next.month, day: next.day, hour: NEXT_DAY_DUE_HOUR }, timeZone),
  };
}

// ---------------------------------------------------------------------------
// Prospect auto-reply (sent from Ben's mailbox; answer first, then the details)
// ---------------------------------------------------------------------------

// Signature block. The email is sent from the SMTP mailbox, so the default signature is the
// mailbox owner; override with MAIL_SIGNATURE_NAME / MAIL_SIGNATURE_TITLE / MAIL_SIGNATURE_EMAIL
// (e.g. name "Pinnacle Sales", title "Dealer Development", email marketing@pinnaclesales.biz).
export const SENDER_DEFAULTS = {
  name: 'Ben Miller',
  title: 'Partner, Pinnacle Sales',
  phone: '480-993-9224',
  phoneHref: 'tel:+14809939224',
  email: 'ben@pinnaclesales.biz',
  site: 'pinnaclesales.biz',
};

export function sender(env = process.env) {
  return {
    ...SENDER_DEFAULTS,
    name: env.MAIL_SIGNATURE_NAME || SENDER_DEFAULTS.name,
    title: env.MAIL_SIGNATURE_TITLE || SENDER_DEFAULTS.title,
    email: env.MAIL_SIGNATURE_EMAIL || env.MAIL_REPLY_TO || SENDER_DEFAULTS.email,
  };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function joinBrands(brands) {
  const names = (brands || []).map((b) => String(b).replace(/\s+(Cabinetry|German Kitchens|Closets|Group)$/i, ''));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

function signatureText(S) {
  return [S.name, S.title, `${S.phone} · ${S.email}`, S.site].join('\n');
}

function signatureHtml(S) {
  return `<p style="margin:24px 0 0">${escapeHtml(S.name)}<br>${escapeHtml(S.title)}<br>` +
    `<a href="${S.phoneHref}">${S.phone}</a> · <a href="mailto:${S.email}">${S.email}</a><br>` +
    `<a href="https://${S.site}">${S.site}</a></p>`;
}

function wrapHtml(paragraphsHtml, S) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;max-width:600px">` +
    paragraphsHtml.join('') + signatureHtml(S) + `</body></html>`;
}

/**
 * @param {object} lead   From normalizeLead()
 * @param {object} touch  From nextTouch()
 * @param {object} [env]
 * @returns {{ subject: string, text: string, html: string }}
 */
export function prospectEmail(lead, touch, env = process.env) {
  const route = lead.route || 'pinnacle';
  const S = route === 'pinnacle' ? sender(env) : {
    ...sender(env),
    title: env.EKD_SIGNATURE_TITLE || 'Pronorm USA · European Kitchen Distributors',
    site: 'pronormusa.com',
  };
  const first = lead.firstName || 'there';
  const knownState = /^other\b/i.test(lead.state || '') ? '' : lead.state;
  const where = [lead.city, knownState].filter(Boolean).join(', ');
  const brands = joinBrands(lead.brands);
  const pages = brandPagesFor(lead.brands, lead.siteUrl).slice(0, 2);
  const stories = `${lead.siteUrl.replace(/\/$/, '')}/dealer-success-stories/`;
  const pronormPage = `${lead.siteUrl.replace(/\/$/, '')}/brands/pronorm-german-kitchens/`;
  const missing = unavailableBrands(lead);
  const missingText = joinBrands(missing);
  const state = knownState ? (lead.stateName || knownState) : '';

  // Outside the WW Wood territory, asking only about WW lines: never promise territory.
  if (route === 'outside') {
    const subject = `${missingText} in ${state || 'your area'} — we'll reply ${touch.phrase}`;
    const p1 = `Hi ${first}, thanks for reaching out. Pinnacle Sales represents ${missingText} to dealers in ${WW_STATE_NAMES_TEXT}, and ${state || 'your area'} is outside that territory, so we can't offer you territory for ${missing.length > 1 ? 'those lines' : 'that line'}. We'll reply ${touch.phrase} with the right contact for your area.`;
    const p2 = `One line we can offer anywhere in the US: Pronorm German Kitchens, available to qualified dealers nationwide with protected territories — ${pronormPage}`;
    return {
      subject,
      text: [p1, p2, signatureText(S)].join('\n\n'),
      html: wrapHtml([`<p>${escapeHtml(p1)}</p>`, `<p>One line we can offer anywhere in the US: <a href="${escapeHtml(pronormPage)}">Pronorm German Kitchens</a>, available to qualified dealers nationwide with protected territories.</p>`], S),
    };
  }

  // Pronorm outside the WW territory: EKD / Pronorm USA, not "your Pinnacle Sales rep".
  if (route === 'ekd') {
    const callLine = lead.phone ? `will call you at ${lead.phone} ${touch.phrase}` : `will reach out ${touch.phrase}`;
    const subject = `Pronorm German Kitchens${where ? ` in ${where}` : ''} — ${lead.phone ? 'call' : 'reply'} ${touch.phrase}`;
    const p1 = `Hi ${first}, thanks — we received your ${lead.form === 'territory-check' ? 'territory question' : 'request'}${lead.company ? ` for ${lead.company}` : ''}. Pronorm German Kitchens are available to qualified dealers nationwide with protected territories, and your Pronorm USA rep ${callLine} to talk through what's open${where ? ` in ${where}` : ''}, a first display, and opening orders.`;
    const p2 = missing.length
      ? `A note on ${missingText}: Pinnacle Sales represents ${missing.length > 1 ? 'those lines' : 'that line'} only in ${WW_STATE_NAMES_TEXT}, so ${missing.length > 1 ? 'they are' : 'it is'} not something we can offer in ${state || 'your state'}.`
      : '';
    const p3 = `Worth a look before we talk: ${pronormPage}`;
    const paras = [p1, p2, p3].filter(Boolean);
    return {
      subject,
      text: [...paras, signatureText(S)].join('\n\n'),
      html: wrapHtml([`<p>${escapeHtml(p1)}</p>`, p2 ? `<p>${escapeHtml(p2)}</p>` : '', `<p>Worth a look before we talk: <a href="${escapeHtml(pronormPage)}">Pronorm German Kitchens</a></p>`], S),
    };
  }

  if (lead.form === 'territory-check') {
    const what = brands ? `${where || 'your market'} is open for ${brands}` : `${where || 'your market'} is open`;
    const subject = `${where || 'Your market'} — territory answer coming ${touch.phrase}`;
    const p1 = `Hi ${first}, thanks for asking. You wanted to know whether ${what}. We're checking the current map, and your Pinnacle Sales rep will reply ${touch.phrase} with what's available and how territory protection works there.`;
    const p2 = `If it's open, the next step is a 20-minute call to talk through a first display and opening order. If it isn't, we'll tell you what's nearby and keep ${lead.company || 'you'} in mind if ${lead.city || 'that market'} opens up.`;
    const p3 = `If you'd rather talk now, call us at ${S.phone}.`;
    return {
      subject,
      text: [p1, p2, p3, signatureText(S)].join('\n\n'),
      html: wrapHtml([p1, p2, p3].map((p) => `<p>${escapeHtml(p)}</p>`), S),
    };
  }

  // Dealer application and "Dealer Partnership Inquiry" contact submissions
  const forWhat = lead.company ? ` for ${lead.company}` : '';
  const inWhere = where ? ` in ${where}` : '';
  const callLine = lead.phone
    ? `your Pinnacle Sales rep will call you at ${lead.phone} ${touch.phrase}`
    : `your Pinnacle Sales rep will reach out ${touch.phrase}`;
  const topics = brands
    ? `what's open in your market for ${brands}, what a first display and opening order look like, and how our team supports you after launch`
    : `what's open in your market, what a first display and opening order look like, and how our team supports you after launch`;

  const subject = `Your Pinnacle Sales ${lead.form === 'contact' ? 'dealer inquiry' : 'dealer application'} — call ${touch.phrase}`;
  const p1 = `Hi ${first}, thanks — we received your ${lead.form === 'contact' ? 'inquiry' : 'application'}${forWhat}${inWhere}. Next step is a call: ${callLine} to cover three things — ${topics}.`;
  const p2 = `If a specific window works better, just reply with it and we'll call then.`;
  const links = [
    ...pages.map((p) => ({ label: p.label, url: p.url })),
    { label: 'What dealers say about working with us', url: stories },
  ];
  const p3Text = `Worth a look before we talk:\n${links.map((l) => `• ${l.label}: ${l.url}`).join('\n')}`;
  const p3Html = `<p>Worth a look before we talk:</p><ul>${links.map((l) => `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a></li>`).join('')}</ul>`;

  return {
    subject,
    text: [p1, p2, p3Text, signatureText(S)].join('\n\n'),
    html: wrapHtml([`<p>${escapeHtml(p1)}</p>`, `<p>${escapeHtml(p2)}</p>`, p3Html], S),
  };
}

// ---------------------------------------------------------------------------
// Internal alert to the team
// ---------------------------------------------------------------------------

/**
 * @param {object} lead
 * @param {object|null} sync   Result of syncLeadToHubSpot (null when HubSpot is off)
 * @param {object} touch
 * @param {string[]} summaryLines
 */
export function internalAlert(lead, sync, touch, summaryLines) {
  const where = [lead.city, lead.state].filter(Boolean).join(', ');
  const tag = { ekd: '[Pronorm/EKD] ', outside: '[Outside WW territory] ' }[lead.route] || '';
  const subject = `${tag}New dealer lead: ${lead.company || lead.name || lead.email}${where ? ` (${where})` : ''} — ${lead.formLabel}`;

  const linkLines = [];
  if (sync?.urls?.deal) linkLines.push(`Deal${sync.dealReused ? ' (existing, reused)' : ''}: ${sync.urls.deal}`);
  if (sync?.urls?.contact) linkLines.push(`Contact: ${sync.urls.contact}`);
  if (sync?.urls?.company) linkLines.push(`Company: ${sync.urls.company}`);
  if (sync?.urls?.task) linkLines.push(`Task: ${sync.urls.task}`);
  if (!sync) linkLines.push('HubSpot sync: FAILED or not configured — work this lead from this email and check Netlify function logs');
  if (sync && !sync.dealId && lead.route === 'outside') linkLines.push('No deal opened: outside the WW territory, WW lines only.');
  if (sync?.warnings?.length) linkLines.push(...sync.warnings.map((w) => `Warning: ${w}`));

  const text = [
    `${lead.route === 'outside' ? 'Prospect was told to expect a reply' : 'Prospect was told to expect a call'} ${touch.phrase}. Task due ${touch.dueAt.toLocaleString('en-US', { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' })} PT.`,
    '',
    ...summaryLines,
    '',
    ...linkLines,
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">` +
    `<p><strong>Prospect was told to expect a call ${escapeHtml(touch.phrase)}.</strong> Task due ${escapeHtml(touch.dueAt.toLocaleString('en-US', { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' }))} PT.</p>` +
    `<p>${summaryLines.map(escapeHtml).join('<br>')}</p>` +
    `<p>${linkLines.map((l) => {
      const i = l.indexOf('http');
      return i >= 0 ? `${escapeHtml(l.slice(0, i))}<a href="${escapeHtml(l.slice(i))}">${escapeHtml(l.slice(i))}</a>` : escapeHtml(l);
    }).join('<br>')}</p></body></html>`;

  return { subject, text, html };
}
