// Normalizes a Netlify Forms "submission-created" payload into one Lead shape,
// regardless of which form produced it. Only dealer-intent forms return a lead.

/** Forms that count as dealer leads, and how to read them. */
export const LEAD_FORMS = {
  'dealer-application': {
    label: 'Dealer Application',
    shortLabel: 'application',
    accepts: () => true,
  },
  'territory-check': {
    label: 'Territory Check',
    shortLabel: 'territory check',
    accepts: () => true,
  },
  contact: {
    label: 'Contact — Dealer Partnership Inquiry',
    shortLabel: 'dealer inquiry',
    // The general contact form only counts when the visitor picked the dealer topic.
    accepts: (data) => /dealer\s+partnership/i.test(str(data.subject)),
  },
};

const US_STATE_NAMES = {
  AZ: 'Arizona', CA: 'California', CO: 'Colorado', ID: 'Idaho', MT: 'Montana',
  NV: 'Nevada', NM: 'New Mexico', OR: 'Oregon', UT: 'Utah', WA: 'Washington',
};

const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com',
  'icloud.com', 'me.com', 'mac.com', 'msn.com', 'comcast.net', 'att.net',
  'sbcglobal.net', 'verizon.net', 'cox.net', 'protonmail.com', 'proton.me', 'ymail.com',
]);

export function str(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean).join(', ');
  return String(v).trim();
}

/** Netlify sends repeated checkbox values either as an array or a joined string. */
export function toArray(v) {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  if (!s) return [];
  return s.split(/\s*,\s*/).filter(Boolean);
}

export function splitName(full) {
  const parts = str(full).replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function normalizeState(v) {
  const s = str(v);
  if (!s) return '';
  const upper = s.toUpperCase();
  if (US_STATE_NAMES[upper]) return upper;
  // "Other (Pronorm nationwide)" and similar free-text values pass through trimmed.
  const byName = Object.entries(US_STATE_NAMES).find(([, name]) => name.toLowerCase() === s.toLowerCase());
  return byName ? byName[0] : s;
}

export function stateName(code) {
  return US_STATE_NAMES[code] || code || '';
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(email));
}

export function normalizeWebsite(v) {
  const s = str(v);
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function domainFromUrl(url) {
  try {
    const host = new URL(normalizeWebsite(url)).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function domainFromEmail(email) {
  const at = str(email).lastIndexOf('@');
  if (at < 0) return '';
  const d = str(email).slice(at + 1).toLowerCase();
  return FREE_MAIL_DOMAINS.has(d) ? '' : d;
}

/**
 * @param {object} payload  The `payload` object from the Netlify event body.
 * @returns {object|null}   A Lead, or null when the submission is not a dealer lead.
 */
export function normalizeLead(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const formName = str(payload.form_name);
  const spec = LEAD_FORMS[formName];
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  if (!spec || !spec.accepts(data)) return null;

  const email = str(data.email || data['contact-email']).toLowerCase();
  if (!isValidEmail(email)) return null;

  const name = str(data.name || data['contact-name']);
  const { firstName, lastName } = splitName(name);
  const state = normalizeState(data.state);
  const brands = formName === 'territory-check' ? toArray(data.brand) : toArray(data['brands-interest']);

  return {
    form: formName,
    formLabel: spec.label,
    formShortLabel: spec.shortLabel,
    submittedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
    netlifyNumber: payload.number ?? null,
    netlifyId: str(payload.id),
    siteUrl: str(payload.site_url) || 'https://pinnaclesales.biz',
    name,
    firstName,
    lastName,
    email,
    phone: str(data.phone || data['contact-phone']),
    company: str(data.company || data['dealer-company']),
    city: str(data.city),
    state,
    stateName: stateName(state),
    website: normalizeWebsite(data.website),
    businessType: str(data['business-type']),
    brands,
    currentLines: str(data['current-lines']),
    message: str(data.message || data.notes),
    subject: str(data.subject),
    sourcePage: str(data['source-page']) || 'direct',
    referrer: str(data.referrer),
    userAgent: str(data.user_agent),
    ip: str(data.ip),
  };
}

/** Compact multi-line summary used in the deal description and the note. */
export function leadSummaryLines(lead) {
  const lines = [
    `Form: ${lead.formLabel}`,
    `Submitted: ${lead.submittedAt.toISOString()}`,
    `Name: ${lead.name || '—'}`,
    `Company: ${lead.company || '—'}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || '—'}`,
    `Location: ${[lead.city, lead.state].filter(Boolean).join(', ') || '—'}`,
  ];
  if (lead.website) lines.push(`Website: ${lead.website}`);
  if (lead.businessType) lines.push(`Business type: ${lead.businessType}`);
  if (lead.brands.length) lines.push(`Brands of interest: ${lead.brands.join(', ')}`);
  if (lead.currentLines) lines.push(`Current lines: ${lead.currentLines}`);
  if (lead.subject) lines.push(`Subject: ${lead.subject}`);
  if (lead.message) lines.push(`Message: ${lead.message}`);
  lines.push(`Source page: ${lead.sourcePage}`);
  if (lead.referrer) lines.push(`Referrer: ${lead.referrer}`);
  if (lead.netlifyNumber !== null) lines.push(`Netlify submission #${lead.netlifyNumber}`);
  return lines;
}
