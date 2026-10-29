import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
  USERS_STORE,
  SESSION_COOKIE,
  SESSION_TTL_S,
  normalizeUsername,
  verifyPassword,
  signSession,
} from '../lib/dealer-hub-auth.mjs';

// POST /api/dealer-hub/login  { username, password }
// → 200 { displayName } + HttpOnly session cookie, or 401.
//
// Accounts live in the `dealer-hub-users` blob store as
//   key: lowercased username  →  { displayName, hash: "scrypt$..." }
// managed with scripts/dealer-hub-users.mjs. No usernames or passwords are in
// the repo or the page source.

const MAX_FAILURES = 10; // per IP per window
const WINDOW_MS = 15 * 60 * 1000;

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

export default async (req: Request, context: { ip?: string }) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const secret = process.env.DEALER_HUB_SESSION_SECRET;
  if (!secret || secret.length < 32) return json(503, { error: 'Dealer Hub sign-in is not configured yet.' });

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid request' });
  }
  const username = normalizeUsername(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || username.length > 254 || password.length > 256) {
    return json(400, { error: 'Enter your username and password.' });
  }

  // Throttle brute-force attempts per IP.
  const throttle = getStore('dealer-hub-throttle');
  const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const throttleKey = `ip/${ip}`;
  const record = ((await throttle.get(throttleKey, { type: 'json' })) as { n: number; t: number } | null) || null;
  const now = Date.now();
  const recent = record && now - record.t < WINDOW_MS ? record : null;
  if (recent && recent.n >= MAX_FAILURES) {
    return json(429, { error: 'Too many attempts. Try again in 15 minutes.' });
  }

  const users = getStore(USERS_STORE);
  const account = (await users.get(username, { type: 'json' })) as { displayName?: string; hash?: string } | null;
  const ok = await verifyPassword(password, account?.hash);

  if (!ok || !account) {
    await throttle.setJSON(throttleKey, { n: (recent?.n || 0) + 1, t: recent?.t || now });
    return json(401, { error: 'Invalid username or password.' });
  }
  if (recent) await throttle.delete(throttleKey);

  const displayName = account.displayName || username;
  const token = signSession({ username, displayName }, secret);
  const cookie = `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_S}; HttpOnly; Secure; SameSite=Lax`;
  return json(200, { displayName }, { 'Set-Cookie': cookie });
};

export const config: Config = { path: '/api/dealer-hub/login' };
