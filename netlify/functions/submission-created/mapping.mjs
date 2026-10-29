// Portal-specific constants and value mappings for the Pinnacle Sales HubSpot account.
// Everything here was read from the live portal (app-na2.hubspot.com, account 244107450)
// on 2026-09-28. Override the IDs with environment variables if the portal changes.

export const HUBSPOT_DEFAULTS = {
  portalId: '244107450',
  uiDomain: 'app-na2.hubspot.com',
  apiBase: 'https://api.hubapi.com',
  // "Dealer Acquisition" pipeline and its "New Prospect" stage.
  dealerAcquisitionPipelineId: '1403353831',
  newProspectStageId: '2277725906',
  // Terminal stages — an existing deal in one of these is never reused.
  closedStageIds: ['2277725912' /* Closed Lost */, '2279445202' /* First Order Booked - Active Dealer */],
  // Owner IDs (Settings → Users & Teams). Ben is the default for every inbound dealer lead.
  owners: {
    ben: '84039521',
    scott: '160712108',
    gillian: '160712129',
    josh: '160712575',
  },
};

/** HubSpot object type IDs used to build record URLs. */
export const OBJECT_TYPE_IDS = {
  contacts: '0-1',
  companies: '0-2',
  deals: '0-3',
  tasks: '0-27',
  notes: '0-46',
};

/**
 * Owner routing by two-letter state. Read from LEAD_OWNER_BY_STATE (JSON) when set,
 * e.g. {"AZ":"160712108","NM":"160712108","OR":"160712575","WA":"160712575"}.
 * Anything not listed goes to the default owner (LEAD_DEFAULT_OWNER_ID, else Ben).
 */
export function ownerForState(state, env = process.env) {
  const fallback = String(env.LEAD_DEFAULT_OWNER_ID || HUBSPOT_DEFAULTS.owners.ben);
  if (!env.LEAD_OWNER_BY_STATE) return fallback;
  try {
    const map = JSON.parse(env.LEAD_OWNER_BY_STATE);
    const hit = map[String(state || '').toUpperCase()];
    return hit ? String(hit) : fallback;
  } catch {
    return fallback;
  }
}

// Company `region` (enumeration): SoCal, NoCal, AZ, CO, WA, OR, ID, NM, NV, Other
// Deal `region` (enumeration):    socal, nocal, az, co, wa, or, id, nm, nv, other
const SOCAL_HINTS = [
  'los angeles', 'san diego', 'orange county', 'irvine', 'anaheim', 'newport', 'costa mesa',
  'huntington beach', 'santa ana', 'laguna', 'mission viejo', 'ladera ranch', 'san clemente', 'tustin',
  'fullerton', 'long beach', 'pasadena', 'glendale', 'burbank', 'santa monica', 'torrance', 'malibu',
  'calabasas', 'thousand oaks', 'ventura', 'oxnard', 'camarillo', 'santa barbara', 'riverside',
  'san bernardino', 'temecula', 'murrieta', 'corona', 'ontario', 'rancho cucamonga', 'palm springs',
  'palm desert', 'la quinta', 'indio', 'carlsbad', 'oceanside', 'encinitas', 'la jolla', 'del mar',
  'rancho santa fe', 'chula vista', 'escondido', 'poway', 'san marcos', 'vista', 'la cañada', 'la canada',
  'claremont', 'pomona', 'whittier', 'downey', 'inglewood', 'beverly hills', 'west hollywood',
  'sherman oaks', 'studio city', 'encino', 'woodland hills', 'valencia', 'santa clarita', 'lancaster',
  'palmdale', 'bakersfield', 'san luis obispo', 'paso robles', 'pismo', 'arroyo grande',
];
const NOCAL_HINTS = [
  'san francisco', 'oakland', 'san jose', 'sacramento', 'walnut creek', 'berkeley', 'palo alto',
  'menlo park', 'mountain view', 'sunnyvale', 'santa clara', 'cupertino', 'los gatos', 'saratoga',
  'fremont', 'hayward', 'san mateo', 'burlingame', 'redwood city', 'san rafael', 'mill valley',
  'novato', 'petaluma', 'santa rosa', 'napa', 'sonoma', 'vallejo', 'concord', 'pleasanton',
  'livermore', 'danville', 'san ramon', 'lafayette', 'orinda', 'alameda', 'marin', 'monterey',
  'carmel', 'santa cruz', 'salinas', 'fresno', 'clovis', 'modesto', 'stockton', 'lodi', 'elk grove',
  'roseville', 'rocklin', 'folsom', 'el dorado hills', 'davis', 'chico', 'redding', 'eureka',
  'truckee', 'tahoe', 'auburn', 'grass valley', 'campbell', 'gilroy', 'morgan hill', 'tracy',
];

export function caRegionFromCity(city) {
  const c = String(city || '').toLowerCase().trim();
  if (!c) return null;
  if (SOCAL_HINTS.some((h) => c.includes(h))) return 'socal';
  if (NOCAL_HINTS.some((h) => c.includes(h))) return 'nocal';
  return null;
}

/** Returns { company: 'SoCal', deal: 'socal' } or null when the region is unknown. */
export function regionFor(state, city) {
  const s = String(state || '').toUpperCase();
  const simple = { AZ: 'AZ', CO: 'CO', WA: 'WA', OR: 'OR', ID: 'ID', NM: 'NM', NV: 'NV' };
  if (simple[s]) return { company: simple[s], deal: simple[s].toLowerCase() };
  if (s === 'CA') {
    const r = caRegionFromCity(city);
    if (r === 'socal') return { company: 'SoCal', deal: 'socal' };
    if (r === 'nocal') return { company: 'NoCal', deal: 'nocal' };
    return null; // Ben decides SoCal vs NoCal for unrecognized CA cities.
  }
  if (!s) return null;
  return { company: 'Other', deal: 'other' };
}

/** Website "Business Type" → company `dealer_type` enumeration. */
export function dealerTypeFor(businessType) {
  const b = String(businessType || '').toLowerCase();
  if (!b) return null;
  if (b.includes('showroom') || b.includes('dealer group') || b.includes('multi-location')) return 'Kitchen & Bath Dealer';
  if (b.includes('design-build') || b.includes('design build')) return 'Design-Build Firm';
  if (b.includes('remodel') || b.includes('contractor')) return 'Remodeler / Contractor';
  if (b.includes('flooring') || b.includes('surface')) return 'Flooring / Surfaces Store';
  return 'Other'; // Interior design studios, custom home builders, startups, "Other".
}

/** Brands of interest → company `primary_brand_focus` enumeration. */
export function primaryBrandFocusFor(brands) {
  const set = new Set((brands || []).map((b) => String(b).toLowerCase()));
  const has = (k) => [...set].some((b) => b.includes(k));
  if (has('shiloh') && has('eclipse')) return 'shiloh__eclipse';
  if (has('shiloh')) return 'shiloh';
  if (has('eclipse')) return 'eclipse';
  if (has('aspect')) return 'aspect';
  return set.size ? 'other' : null;
}

/** Public brand pages, used in the prospect auto-reply. */
export const BRAND_PAGES = [
  { match: /shiloh/i, label: 'Shiloh Cabinetry', path: '/brands/shiloh-cabinetry/' },
  { match: /eclipse/i, label: 'Eclipse Cabinetry', path: '/brands/eclipse-cabinetry/' },
  { match: /aspect/i, label: 'Aspect Cabinetry', path: '/brands/aspect-cabinetry/' },
  { match: /pronorm/i, label: 'Pronorm German Kitchens', path: '/brands/pronorm-german-kitchens/' },
  { match: /vistora/i, label: 'Vistora Closets', path: '/brands/vistora-closets/' },
  { match: /stone/i, label: 'US Stone Group', path: '/brands/us-stone-group/' },
];

export function brandPagesFor(brands, siteUrl = 'https://pinnaclesales.biz') {
  const out = [];
  for (const b of brands || []) {
    const hit = BRAND_PAGES.find((p) => p.match.test(String(b)));
    if (hit && !out.some((o) => o.path === hit.path)) out.push({ label: hit.label, url: `${siteUrl.replace(/\/$/, '')}${hit.path}` });
  }
  return out;
}

export function recordUrl(objectType, id, env = process.env) {
  const portalId = env.HUBSPOT_PORTAL_ID || HUBSPOT_DEFAULTS.portalId;
  const uiDomain = env.HUBSPOT_UI_DOMAIN || HUBSPOT_DEFAULTS.uiDomain;
  const typeId = OBJECT_TYPE_IDS[objectType];
  if (!typeId || !id) return '';
  return `https://${uiDomain}/contacts/${portalId}/record/${typeId}/${id}`;
}
