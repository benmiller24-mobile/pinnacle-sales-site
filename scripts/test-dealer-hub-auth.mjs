// Offline tests for the Dealer Hub login (netlify/shared/hub-auth.mjs, the auth function,
// and the edge gate). Run: npm run test:hub
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as A from '../netlify/shared/hub-auth.mjs';
import { handleRequest } from '../netlify/functions/dealer-hub-auth/dealer-hub-auth.mjs';
import gate from '../netlify/edge-functions/dealer-hub-gate.js';

const SECRET = 'test-secret-0123456789-abcdefghijklmnop';
let passed = 0;
async function t(name, fn) { await fn(); passed++; if (!process.argv.includes('--quiet')) console.log('ok -', name); }

await t('passcode is deterministic, 12 chars, case/space/dash-insensitive username', async () => {
  const a = await A.derivePasscode(SECRET, 'Acme Kitchens');
  const b = await A.derivePasscode(SECRET, '  acme   KITCHENS ');
  assert.equal(a, b);
  assert.match(a, /^[0-9A-HJKMNP-TV-Z]{12}$/);
  assert.notEqual(a, await A.derivePasscode(SECRET, 'Other Dealer'));
  assert.notEqual(a, await A.derivePasscode(SECRET, 'Acme Kitchens', 2));
  assert.notEqual(a, await A.derivePasscode(SECRET + 'x', 'Acme Kitchens'));
});

await t('short or missing secret is rejected', async () => {
  await assert.rejects(() => A.derivePasscode('short', 'x'));
  await assert.rejects(() => A.verifyLogin({ secret: '', username: 'x', passcode: 'y' }));
});

await t('verifyLogin accepts formatted / lower-case / look-alike passcodes, rejects others', async () => {
  const raw = await A.derivePasscode(SECRET, 'Acme Kitchens');
  for (const p of [raw, A.formatPasscode(raw), A.formatPasscode(raw).toLowerCase(), ` ${raw} `]) {
    assert.equal((await A.verifyLogin({ secret: SECRET, username: 'acme kitchens', passcode: p })).ok, true, p);
  }
  assert.equal((await A.verifyLogin({ secret: SECRET, username: 'acme kitchens', passcode: 'AAAA-AAAA-AAAA' })).ok, false);
  assert.equal((await A.verifyLogin({ secret: SECRET, username: '', passcode: raw })).ok, false);
  assert.equal((await A.verifyLogin({ secret: SECRET, username: 'Other', passcode: raw })).ok, false);
});

await t('revocation and generation bumps', async () => {
  const raw = await A.derivePasscode(SECRET, 'Acme Kitchens');
  assert.equal((await A.verifyLogin({ secret: SECRET, username: 'Acme Kitchens', passcode: raw, revoked: 'foo, acme kitchens' })).ok, false);
  assert.equal((await A.verifyLogin({ secret: SECRET, username: 'Acme Kitchens', passcode: raw, generations: 'acme kitchens=2' })).ok, false);
  const gen2 = await A.derivePasscode(SECRET, 'Acme Kitchens', 2);
  assert.equal((await A.verifyLogin({ secret: SECRET, username: 'Acme Kitchens', passcode: gen2, generations: 'Acme Kitchens=2' })).ok, true);
});

await t('sessions: valid, tampered, expired, revoked, wrong generation, wrong secret', async () => {
  const now = Date.now();
  const v = await A.createSession(SECRET, { username: 'Acme Kitchens', name: 'Acme Kitchens' }, now);
  assert.equal((await A.readSession(SECRET, v, { now })).u, 'acme kitchens');
  assert.equal(await A.readSession(SECRET, v.slice(0, -2) + 'AA', { now }), null);
  const [body, sig] = v.split('.');
  const forged = Buffer.from(JSON.stringify({ u: 'x', n: 'x', g: 1, exp: now + 1e9 })).toString('base64url');
  assert.equal(await A.readSession(SECRET, `${forged}.${sig}`, { now }), null);
  assert.equal(await A.readSession(SECRET, v, { now: now + (A.SESSION_DAYS + 1) * 86400000 }), null);
  assert.equal(await A.readSession(SECRET, v, { now, revoked: 'acme kitchens' }), null);
  assert.equal(await A.readSession(SECRET, v, { now, generations: 'acme kitchens=2' }), null);
  assert.equal(await A.readSession(SECRET + 'x', v, { now }), null);
  assert.equal(await A.readSession(SECRET, `${body}`, { now }), null);
  assert.equal(await A.readSession(undefined, v, { now }), null);
});

await t('redirects stay inside the hub', async () => {
  assert.equal(A.safeHubRedirect('/dealer-hub/ordering/'), '/dealer-hub/ordering/');
  for (const bad of ['https://evil.example/', '//evil.example', '/dealer-hub/../admin', 'javascript:alert(1)', '/contact/', '']) {
    assert.equal(A.safeHubRedirect(bad), '/dealer-hub/dashboard/', bad);
  }
});

const env = { DEALER_HUB_SECRET: SECRET };
const req = (path, init = {}) => new Request(`https://pinnaclesales.biz${path}`, init);
const post = (path, body, headers = {}) => req(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

await t('login function: success sets HttpOnly cookie; failure is 401 with no cookie', async () => {
  const passcode = A.formatPasscode(await A.derivePasscode(SECRET, 'Acme Kitchens'));
  const ok = await handleRequest(post('/api/dealer-hub/login', { username: 'Acme Kitchens', passcode, redirect: '/dealer-hub/ordering/' }), env);
  assert.equal(ok.status, 200);
  const cookie = ok.headers.get('set-cookie');
  assert.match(cookie, /^ps_hub=[^;]+; Path=\/; Max-Age=\d+; HttpOnly; Secure; SameSite=Lax$/);
  const data = await ok.json();
  assert.equal(data.redirect, '/dealer-hub/ordering/');
  assert.equal(data.name, 'Acme Kitchens');

  const sess = await handleRequest(req('/api/dealer-hub/session', { headers: { cookie: cookie.split(';')[0] } }), env);
  assert.equal(sess.status, 200);
  assert.equal((await sess.json()).name, 'Acme Kitchens');

  const bad = await handleRequest(post('/api/dealer-hub/login', { username: 'Acme Kitchens', passcode: 'AAAA-AAAA-AAAA' }), env);
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get('set-cookie'), null);
});

await t('login function: unconfigured → 503; logout clears cookie; wrong methods → 405', async () => {
  assert.equal((await handleRequest(post('/api/dealer-hub/login', { username: 'a', passcode: 'b' }), {})).status, 503);
  const out = await handleRequest(req('/api/dealer-hub/logout', { method: 'POST' }), env);
  assert.match(out.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await handleRequest(req('/api/dealer-hub/login'), env)).status, 405);
  assert.equal((await handleRequest(req('/api/dealer-hub/session'), env)).status, 401);
});

await t('edge gate: login page public; hub pages need a valid cookie', async () => {
  globalThis.Netlify = { env: { get: (k) => env[k] } };
  const next = () => new Response('<html>hub page</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
  const ctx = { next: async () => next() };
  assert.equal((await gate(req('/dealer-hub/'), ctx)).status, 200);
  const blocked = await gate(req('/dealer-hub/product-deep-dives/shiloh/'), ctx);
  assert.equal(blocked.status, 302);
  assert.equal(blocked.headers.get('location'), '/dealer-hub/?redirect=%2Fdealer-hub%2Fproduct-deep-dives%2Fshiloh%2F');
  const v = await A.createSession(SECRET, { username: 'Acme Kitchens', name: 'Acme Kitchens' });
  const allowed = await gate(req('/dealer-hub/ordering/', { headers: { cookie: `x=1; ps_hub=${v}` } }), ctx);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('cache-control'), 'private, no-store');
  assert.equal((await gate(req('/dealer-hub/ordering/', { headers: { cookie: 'ps_hub=garbage.sig' } }), ctx)).status, 302);
  globalThis.Netlify = { env: { get: () => undefined } };
  assert.equal((await gate(req('/dealer-hub/ordering/', { headers: { cookie: `ps_hub=${v}` } }), ctx)).status, 302, 'fails closed without a secret');
});

await t('no credentials or passwords left in the hub login page', async () => {
  const html = readFileSync(new URL('../public/dealer-hub/index.html', import.meta.url), 'utf8');
  assert.equal(/CREDENTIALS|password\s*:/.test(html), false);
});

console.log(`\nAll ${passed} dealer-hub auth tests passed.`);
