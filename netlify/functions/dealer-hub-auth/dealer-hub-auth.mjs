// Dealer Hub login / session / logout endpoints (Netlify Functions v2).
//
//   POST /api/dealer-hub/login    { username, passcode }  → sets the signed ps_hub cookie
//   GET  /api/dealer-hub/session                          → { name } when signed in, else 401
//   POST /api/dealer-hub/logout                           → clears the cookie
//
// Passcodes are derived from DEALER_HUB_SECRET (see netlify/shared/hub-auth.mjs and
// scripts/hub-passcodes.mjs) — there is no stored list of dealers or passwords.

import {
  clearedCookie,
  createSession,
  getCookie,
  parseGenerations,
  readSession,
  safeHubRedirect,
  sessionCookie,
  verifyLogin,
} from '../../shared/hub-auth.mjs';

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function settings(env) {
  return {
    secret: env.DEALER_HUB_SECRET,
    revoked: env.DEALER_HUB_REVOKED || '',
    generations: env.DEALER_HUB_GENERATIONS || '',
  };
}

export async function handleRequest(request, env = process.env) {
  const { pathname } = new URL(request.url);
  const action = pathname.replace(/\/+$/, '').split('/').pop();
  const cfg = settings(env);

  if (action === 'logout') {
    if (request.method !== 'POST') return json(405, { error: 'POST only' });
    return json(200, { ok: true }, { 'Set-Cookie': clearedCookie() });
  }

  if (!cfg.secret || cfg.secret.length < 32) {
    console.warn('[dealer-hub] DEALER_HUB_SECRET not configured');
    return json(503, { error: 'The Dealer Hub login is being set up. Please contact your Pinnacle Sales rep.' });
  }

  if (action === 'session') {
    if (request.method !== 'GET') return json(405, { error: 'GET only' });
    const session = await readSession(cfg.secret, getCookie(request.headers.get('cookie')), cfg);
    return session ? json(200, { name: session.n }) : json(401, { error: 'not signed in' });
  }

  if (action === 'login') {
    if (request.method !== 'POST') return json(405, { error: 'POST only' });
    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'Invalid request' });
    }
    const username = String(body?.username || '').trim().slice(0, 120);
    const passcode = String(body?.passcode || '').slice(0, 40);
    const result = await verifyLogin({ secret: cfg.secret, username, passcode, revoked: cfg.revoked, generations: cfg.generations });
    if (!result.ok) {
      // Flat delay on every failure; with 60-bit passcodes this makes guessing hopeless.
      await sleep(600);
      return json(401, { error: 'Invalid username or passcode. Contact your Pinnacle Sales rep if you need access.' });
    }
    const gen = parseGenerations(cfg.generations).get(result.username) || 1;
    const value = await createSession(cfg.secret, { username: result.username, name: username, gen });
    return json(200, { ok: true, name: username, redirect: safeHubRedirect(body?.redirect) }, { 'Set-Cookie': sessionCookie(value) });
  }

  return json(404, { error: 'Not found' });
}

export default async (request) => handleRequest(request, process.env);

export const config = {
  path: ['/api/dealer-hub/login', '/api/dealer-hub/session', '/api/dealer-hub/logout'],
};
