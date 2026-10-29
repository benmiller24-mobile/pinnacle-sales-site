// Offline test for netlify/functions/submission-created (no HubSpot, no SMTP).
// Run:  node scripts/test-dealer-lead-function.mjs          (asserts + prints the emails)
//       node scripts/test-dealer-lead-function.mjs --quiet  (asserts only)

import assert from 'node:assert/strict';
import { processSubmission } from '../netlify/functions/submission-created/submission-created.mjs';
import { normalizeLead } from '../netlify/functions/submission-created/leads.mjs';
import { nextTouch, zonedTimeToUtc, zonedParts, prospectEmail } from '../netlify/functions/submission-created/copy.mjs';
import { regionFor, dealerTypeFor, primaryBrandFocusFor, ownerForState } from '../netlify/functions/submission-created/mapping.mjs';
import { createDryRunFetch } from '../netlify/functions/submission-created/dryrun.mjs';
import { createMailer } from '../netlify/functions/submission-created/mail.mjs';

const quiet = process.argv.includes('--quiet');
const print = (...a) => { if (!quiet) console.log(...a); };

const ENV = {
  DRY_RUN: '1',
  HUBSPOT_BCC_ADDRESS: '244107450@bcc.na2.hubspot.com',
  LEAD_ALERT_TO: 'ben@pinnaclesales.biz, gillian@pinnaclesales.biz',
};

const basePayload = (form, data) => ({
  number: 42,
  id: 'sub_test_1',
  form_name: form,
  site_url: 'https://pinnaclesales.biz',
  created_at: '2026-09-29T17:05:00.000Z', // Tue 10:05 am PT
  data: { ip: '203.0.113.9', user_agent: 'test', referrer: 'https://pinnaclesales.biz/brands/shiloh-cabinetry/', ...data },
});

const applicationPayload = basePayload('dealer-application', {
  'source-page': '/brands/shiloh-cabinetry/arizona/',
  name: 'Maria Gonzales',
  company: 'Desert Modern Kitchens',
  email: 'maria@desertmodernkitchens.com',
  phone: '(520) 555-0142',
  city: 'Tucson',
  state: 'AZ',
  website: 'desertmodernkitchens.com',
  'business-type': 'Kitchen & Bath Showroom',
  'brands-interest': ['Shiloh Cabinetry', 'Eclipse Cabinetry'],
  'current-lines': 'Medallion, about $900K/yr',
  message: 'Opening a second showroom in Oro Valley in Q1.',
});

const territoryPayload = basePayload('territory-check', {
  'source-page': '/become-a-dealer/',
  name: 'Dan Whitfield',
  company: 'Whitfield Cabinet Co',
  email: 'dan@gmail.com',
  city: 'San Luis Obispo',
  state: 'CA',
  brand: 'Shiloh Cabinetry',
});

const contactDealerPayload = basePayload('contact', {
  'source-page': '/contact/',
  name: 'Priya Natarajan',
  email: 'priya@studionorthdesign.com',
  phone: '425-555-0199',
  subject: 'Dealer Partnership Inquiry',
  city: 'Bellevue',
  state: 'WA',
  message: 'We are a design-build firm and want to carry a frameless line.',
});

const contactHomeownerPayload = basePayload('contact', {
  name: 'Homeowner Person',
  email: 'someone@example.com',
  subject: 'Homeowner / Designer — Find a Local Dealer',
  city: 'Denver',
  state: 'CO',
  message: 'Looking for a Shiloh dealer near me.',
});

// ---- Unit: mappings ---------------------------------------------------------
assert.deepEqual(regionFor('AZ', 'Tucson'), { company: 'AZ', deal: 'az' });
assert.deepEqual(regionFor('CA', 'San Diego'), { company: 'SoCal', deal: 'socal' });
assert.deepEqual(regionFor('CA', 'Walnut Creek'), { company: 'NoCal', deal: 'nocal' });
assert.equal(regionFor('CA', 'Visalia'), null);
assert.deepEqual(regionFor('MT', 'Bozeman'), { company: 'Other', deal: 'other' });
assert.equal(regionFor('', ''), null);
assert.equal(dealerTypeFor('Kitchen & Bath Showroom'), 'Kitchen & Bath Dealer');
assert.equal(dealerTypeFor('Multi-Location Dealer Group'), 'Kitchen & Bath Dealer');
assert.equal(dealerTypeFor('Design-Build Firm'), 'Design-Build Firm');
assert.equal(dealerTypeFor('Custom Home Builder'), 'Other');
assert.equal(dealerTypeFor(''), null);
assert.equal(primaryBrandFocusFor(['Shiloh Cabinetry', 'Eclipse Cabinetry']), 'shiloh__eclipse');
assert.equal(primaryBrandFocusFor(['Pronorm German Kitchens']), 'other');
assert.equal(primaryBrandFocusFor([]), null);
assert.equal(ownerForState('AZ', {}), '84039521');
assert.equal(ownerForState('AZ', { LEAD_OWNER_BY_STATE: '{"AZ":"160712108"}' }), '160712108');
assert.equal(ownerForState('CA', { LEAD_OWNER_BY_STATE: '{"AZ":"160712108"}' }), '84039521');
assert.equal(ownerForState('CA', { LEAD_OWNER_BY_STATE: 'not json' }), '84039521');

// ---- Unit: normalizeLead ----------------------------------------------------
const lead = normalizeLead(applicationPayload);
assert.equal(lead.form, 'dealer-application');
assert.equal(lead.firstName, 'Maria');
assert.equal(lead.lastName, 'Gonzales');
assert.equal(lead.website, 'https://desertmodernkitchens.com');
assert.deepEqual(lead.brands, ['Shiloh Cabinetry', 'Eclipse Cabinetry']);
assert.equal(lead.stateName, 'Arizona');
assert.equal(normalizeLead(contactHomeownerPayload), null, 'homeowner contact submissions are not dealer leads');
assert.equal(normalizeLead(basePayload('dealer-application', { name: 'X', email: 'not-an-email' })), null);
assert.deepEqual(normalizeLead(basePayload('dealer-application', { email: 'a@b.co', 'brands-interest': 'Shiloh Cabinetry, Aspect Cabinetry' })).brands, ['Shiloh Cabinetry', 'Aspect Cabinetry']);

// ---- Unit: timing -----------------------------------------------------------
const at = (iso) => new Date(iso);
let t = nextTouch(at('2026-09-29T17:05:00Z')); // Tue 10:05 PDT
assert.equal(t.phrase, 'later today');
assert.deepEqual(zonedParts(t.dueAt), { ...zonedParts(t.dueAt), hour: 17, minute: 0, day: 29 });
t = nextTouch(at('2026-09-29T22:30:00Z')); // Tue 3:30 pm PDT → after cutoff
assert.equal(t.phrase, 'first thing tomorrow morning');
assert.equal(zonedParts(t.dueAt).day, 30);
assert.equal(zonedParts(t.dueAt).hour, 10);
t = nextTouch(at('2026-10-02T23:00:00Z')); // Fri 4 pm PDT → Monday
assert.equal(t.phrase, 'first thing Monday morning');
assert.equal(zonedParts(t.dueAt).day, 5);
t = nextTouch(at('2026-10-03T18:00:00Z')); // Sat 11 am → Monday
assert.equal(t.phrase, 'first thing Monday morning');
t = nextTouch(at('2026-11-01T08:30:00Z')); // Sun 1:30 am PDT (DST ends this morning) → Monday = tomorrow, 10:00 PST
assert.equal(t.phrase, 'first thing tomorrow morning');
assert.equal(t.dueAt.toISOString(), '2026-11-02T18:00:00.000Z');
assert.equal(zonedTimeToUtc({ year: 2026, month: 7, day: 4, hour: 9 }).toISOString(), '2026-07-04T16:00:00.000Z');
assert.equal(zonedTimeToUtc({ year: 2026, month: 12, day: 4, hour: 9 }).toISOString(), '2026-12-04T17:00:00.000Z');

// ---- Integration (dry run): application → full HubSpot sequence + both emails --------
{
  const dry = createDryRunFetch();
  const mailer = createMailer({ DRY_RUN: '1' });
  const out = await processSubmission(applicationPayload, { env: ENV, now: at('2026-09-29T17:05:00Z'), fetchImpl: dry.fetchImpl, mailer });
  assert.equal(out.skipped, false);
  assert.deepEqual(out.errors, []);
  const seq = dry.calls.map((c) => `${c.method} ${c.path.replace(/\?.*$/, '')}`);
  assert.deepEqual(seq, [
    'GET /crm/v3/objects/contacts/maria%40desertmodernkitchens.com',
    'POST /crm/v3/objects/contacts',
    'POST /crm/v3/objects/companies/search',
    'POST /crm/v3/objects/companies',
    'PUT /crm/v4/objects/contacts/contacts-101/associations/default/companies/companies-102',
    'POST /crm/v3/objects/deals/search',
    'POST /crm/v3/objects/deals',
    'PUT /crm/v4/objects/deals/deals-103/associations/default/contacts/contacts-101',
    'PUT /crm/v4/objects/deals/deals-103/associations/default/companies/companies-102',
    'POST /crm/v3/objects/notes',
    'PUT /crm/v4/objects/notes/notes-104/associations/default/contacts/contacts-101',
    'PUT /crm/v4/objects/notes/notes-104/associations/default/deals/deals-103',
    'PUT /crm/v4/objects/notes/notes-104/associations/default/companies/companies-102',
    'POST /crm/v3/objects/tasks',
    'PUT /crm/v4/objects/tasks/tasks-105/associations/default/contacts/contacts-101',
    'PUT /crm/v4/objects/tasks/tasks-105/associations/default/deals/deals-103',
  ]);
  const contact = dry.calls[1].body.properties;
  assert.equal(contact.lifecyclestage, 'lead');
  assert.equal(contact.hs_lead_status, 'NEW');
  assert.equal(contact.hubspot_owner_id, '84039521');
  assert.equal(contact.cabinetry_line, 'Shiloh Cabinetry, Eclipse Cabinetry');
  const company = dry.calls[3].body.properties;
  assert.equal(company.domain, 'desertmodernkitchens.com');
  assert.equal(company.dealer_status, 'Prospect');
  assert.equal(company.dealer_type, 'Kitchen & Bath Dealer');
  assert.equal(company.primary_brand_focus, 'shiloh__eclipse');
  assert.equal(company.region, 'AZ');
  assert.equal(company.state, 'Arizona');
  const deal = dry.calls[6].body.properties;
  assert.equal(deal.dealname, 'Desert Modern Kitchens — Dealer Application');
  assert.equal(deal.pipeline, '1403353831');
  assert.equal(deal.dealstage, '2277725906');
  assert.equal(deal.deal_source, 'website');
  assert.equal(deal.region, 'az');
  assert.match(deal.description, /Netlify submission #42/);
  const task = dry.calls[13].body.properties;
  assert.equal(task.hs_task_type, 'CALL');
  assert.match(task.hs_task_subject, /later today/);
  assert.equal(new Date(Number(task.hs_timestamp)).toISOString(), '2026-09-30T00:00:00.000Z'); // 5 pm PDT
  assert.equal(out.hubspot.urls.deal, 'https://app-na2.hubspot.com/contacts/244107450/record/0-3/deals-103');
  assert.equal(out.prospectEmail.to, 'maria@desertmodernkitchens.com');
  assert.match(out.prospectEmail.subject, /call later today/);
  assert.deepEqual(out.alertEmail.to, ['ben@pinnaclesales.biz', 'gillian@pinnaclesales.biz']);

  const email = prospectEmail(normalizeLead(applicationPayload), nextTouch(at('2026-09-29T17:05:00Z')));
  assert.match(email.text, /your Pinnacle Sales rep will call you at \(520\) 555-0142 later today/);
  assert.doesNotMatch(email.text, /I'll call/);
  assert.match(email.text, /Shiloh and Eclipse/);
  assert.match(email.text, /brands\/shiloh-cabinetry/);
  assert.doesNotMatch(email.text, /US Stone|Vistora/);
  print('\n===== PROSPECT EMAIL — dealer application =====\nSubject: ' + email.subject + '\n\n' + email.text);
}

// ---- Integration: territory check with free-mail address, existing contact, reused deal ----
{
  const dry = createDryRunFetch({
    existingContact: { id: 'c-9', properties: { firstname: 'Dan', hs_lead_status: 'OPEN', hubspot_owner_id: '160712108' } },
    existingDeal: { id: 'd-9', properties: { dealname: 'Whitfield Cabinet Co — Territory Check (San Luis Obispo, CA)', dealstage: '2277725906' } },
  });
  const out = await processSubmission(territoryPayload, { env: ENV, now: at('2026-10-02T23:00:00Z'), fetchImpl: dry.fetchImpl, mailer: createMailer({ DRY_RUN: '1' }) });
  assert.deepEqual(out.errors, []);
  const seq = dry.calls.map((c) => `${c.method} ${c.path.replace(/\?.*$/, '')}`);
  assert.equal(seq[1], 'PATCH /crm/v3/objects/contacts/c-9');
  const patch = dry.calls[1].body.properties;
  assert.equal(patch.hs_lead_status, undefined, 'existing lead status is left alone');
  assert.equal(patch.lifecyclestage, undefined, 'existing lifecycle is never touched');
  assert.equal(patch.hubspot_owner_id, undefined, 'existing owner is kept');
  assert.ok(seq.includes('POST /crm/v3/objects/companies/search'), 'company is searched by name even with a gmail address');
  assert.ok(!seq.includes('POST /crm/v3/objects/deals'), 'open deal with the same name is reused, not duplicated');
  assert.equal(out.hubspot.dealReused, true);
  const company = dry.calls.find((c) => c.method === 'POST' && c.path === '/crm/v3/objects/companies').body.properties;
  assert.equal(company.domain, undefined, 'gmail is never used as a company domain');
  assert.equal(company.region, 'SoCal');
  const email = prospectEmail(normalizeLead(territoryPayload), nextTouch(at('2026-10-02T23:00:00Z')));
  assert.match(email.subject, /San Luis Obispo, CA — territory answer coming first thing Monday morning/);
  assert.match(email.text, /whether San Luis Obispo, CA is open for Shiloh/);
  assert.match(email.text, /your Pinnacle Sales rep will reply first thing Monday morning/);
  const generic = prospectEmail(normalizeLead(territoryPayload), nextTouch(at('2026-10-02T23:00:00Z')), { MAIL_SIGNATURE_NAME: 'Pinnacle Sales', MAIL_SIGNATURE_TITLE: 'Dealer Development', MAIL_SIGNATURE_EMAIL: 'marketing@pinnaclesales.biz' });
  assert.match(generic.text, /Pinnacle Sales\nDealer Development\n480-993-9224 · marketing@pinnaclesales.biz/);
  assert.doesNotMatch(generic.text, /Ben Miller/);
  print('\n===== PROSPECT EMAIL — territory check (Friday 4 pm) =====\nSubject: ' + email.subject + '\n\n' + email.text);
}

// ---- Integration: contact form dealer inquiry; homeowner topic skipped ------
{
  const dry = createDryRunFetch();
  const out = await processSubmission(contactDealerPayload, { env: ENV, now: at('2026-09-29T17:05:00Z'), fetchImpl: dry.fetchImpl, mailer: createMailer({ DRY_RUN: '1' }) });
  assert.deepEqual(out.errors, []);
  const deal = dry.calls.find((c) => c.method === 'POST' && c.path === '/crm/v3/objects/deals').body.properties;
  assert.equal(deal.dealname, 'Priya Natarajan — Dealer Application'); // no company on the contact form → name
  assert.equal(deal.region, 'wa');
  const company = dry.calls.find((c) => c.method === 'POST' && c.path === '/crm/v3/objects/companies').body.properties;
  assert.equal(company.name, 'studionorthdesign.com', 'company keyed on the email domain when no company name was given');
  const email = prospectEmail(normalizeLead(contactDealerPayload), nextTouch(at('2026-09-29T17:05:00Z')));
  assert.match(email.subject, /dealer inquiry/);
  print('\n===== PROSPECT EMAIL — contact form, dealer topic =====\nSubject: ' + email.subject + '\n\n' + email.text);

  const skipped = await processSubmission(contactHomeownerPayload, { env: ENV, fetchImpl: dry.fetchImpl, mailer: createMailer({ DRY_RUN: '1' }) });
  assert.equal(skipped.skipped, true);
}

// ---- Degradation: no token, no SMTP → clean skip messages, no throw --------
{
  const out = await processSubmission(applicationPayload, { env: {}, mailer: null });
  assert.equal(out.skipped, false);
  assert.equal(out.hubspot, null);
  assert.ok(out.errors.some((e) => /HUBSPOT_PRIVATE_APP_TOKEN/.test(e)));
  assert.ok(out.errors.some((e) => /SMTP_USER/.test(e)));
}

// ---- Degradation: HubSpot down → auto-reply still goes out -------------------
{
  const failingFetch = async () => ({ ok: false, status: 500, statusText: 'boom', headers: { get: () => null }, text: async () => '{"message":"down"}' });
  const out = await processSubmission(applicationPayload, { env: { ...ENV, HUBSPOT_PRIVATE_APP_TOKEN: 'x' }, fetchImpl: failingFetch, mailer: createMailer({ DRY_RUN: '1' }) });
  assert.equal(out.hubspot, null);
  assert.ok(out.errors.some((e) => /^hubspot:/.test(e)));
  assert.ok(out.prospectEmail, 'prospect still gets the reply');
  assert.ok(out.alertEmail, 'team still gets the alert (with the HubSpot skip noted)');
}

console.log('\nAll dealer-lead function tests passed.');
