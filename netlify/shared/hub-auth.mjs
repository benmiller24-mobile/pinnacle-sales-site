// Dealer Hub authentication primitives, shared by the edge gate (Deno) and the login
// function (Node 22). Web Crypto + TextEncoder only, so the same file runs in both.
//
// Design
// ------
// * No dealer list or password lives in the repo, the page source, or an env var.
//   Each dealer's passcode is DERIVED: HMAC-SHA256(DEALER_HUB_SECRET, "passcode:v1:<username>:<generation>"),
//   rendered as 12 Crockford-base32 characters (60 bits), shown as XXXX-XXXX-XXXX.
//   Issuing a passcode = running scripts/hub-passcodes.mjs with the secret.
// * Revoking one dealer: add the username to DEALER_HUB_REVOKED.
//   Re-issuing one dealer's passcode: bump their generation in DEALER_HUB_GENERATIONS.
//   Revoking everyone: rotate DEALER_HUB_SECRET (also signs everyone out).
// * Sessions are a signed cookie: base64url(JSON payload) + "." + base64url(HMAC).

export const COOKIE_NAME = 'ps_hub';
export const SESSION_DAYS = 14;
export const MIN_SECRET_LENGTH = 32;

const enc = new TextEncoder();
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Lower-case, trimmed, single-spaced. "  Acme  Kitchens " → "acme kitchens" */
export function normalizeUsername(username) {
  return String(username ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Upper-case, dashes/spaces removed, and the usual look-alikes mapped (O→0, I/L→1). */
export function normalizePasscode(passcode) {
  return String(passcode ?? '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

export function formatPasscode(raw) {
  return raw.match(/.{1,4}/g).join('-');
}

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/** Constant-time comparison of two strings (length leak only). */
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function assertSecret(secret) {
  if (!secret || String(secret).length < MIN_SECRET_LENGTH) {
    throw new Error(`DEALER_HUB_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters`);
  }
}

/** Parses DEALER_HUB_GENERATIONS: "acme kitchens=2, other dealer=3" → Map */
export function parseGenerations(value) {
  const map = new Map();
  for (const part of String(value ?? '').split(',')) {
    const [name, gen] = part.split('=');
    const n = normalizeUsername(name);
    const g = Number.parseInt(String(gen ?? '').trim(), 10);
    if (n && Number.isFinite(g) && g > 1) map.set(n, g);
  }
  return map;
}

/** Parses DEALER_HUB_REVOKED: "acme kitchens, other dealer" → Set */
export function parseRevoked(value) {
  return new Set(String(value ?? '').split(',').map(normalizeUsername).filter(Boolean));
}

/** The 12-character passcode for a username (unformatted). */
export async function derivePasscode(secret, username, generation = 1) {
  assertSecret(secret);
  const user = normalizeUsername(username);
  if (!user) throw new Error('username is required');
  const mac = await hmac(secret, `passcode:v1:${user}:${generation}`);
  // 60 bits → 12 base32 characters
  let bits = 0n;
  for (let i = 0; i < 8; i++) bits = (bits << 8n) | BigInt(mac[i]);
  bits >>= 4n; // keep the top 60 bits
  let out = '';
  for (let i = 0; i < 12; i++) {
    out = CROCKFORD[Number(bits & 31n)] + out;
    bits >>= 5n;
  }
  return out;
}

/**
 * Checks a username/passcode pair against the secret and the env-based revoke/generation lists.
 * @returns {Promise<{ ok: boolean, username?: string, reason?: string }>}
 */
export async function verifyLogin({ secret, username, passcode, revoked = '', generations = '' }) {
  assertSecret(secret);
  const user = normalizeUsername(username);
  const given = normalizePasscode(passcode);
  if (!user || given.length !== 12) return { ok: false, reason: 'format' };
  if (parseRevoked(revoked).has(user)) return { ok: false, reason: 'revoked' };
  const gen = parseGenerations(generations).get(user) || 1;
  const expected = await derivePasscode(secret, user, gen);
  return safeEqual(expected, given) ? { ok: true, username: user } : { ok: false, reason: 'mismatch' };
}

/** Signed session value for the cookie. `name` is what the hub greets the dealer with. */
export async function createSession(secret, { username, name, gen = 1 }, now = Date.now()) {
  assertSecret(secret);
  const payload = { u: normalizeUsername(username), n: String(name || username).slice(0, 80), g: gen, exp: now + SESSION_DAYS * 86400000 };
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmac(secret, `session:v1:${body}`));
  return `${body}.${sig}`;
}

/**
 * Verifies a session value. Revocation and generation bumps take effect immediately
 * because they are re-checked here on every request.
 * @returns {Promise<null | { u: string, n: string, g: number, exp: number }>}
 */
export async function readSession(secret, value, { revoked = '', generations = '', now = Date.now() } = {}) {
  if (!secret || !value || typeof value !== 'string') return null;
  const dot = value.indexOf('.');
  if (dot < 1) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let expected;
  try {
    expected = toBase64Url(await hmac(secret, `session:v1:${body}`));
  } catch {
    return null;
  }
  if (!safeEqual(expected, sig)) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload.u !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp <= now) return null;
  if (parseRevoked(revoked).has(payload.u)) return null;
  const currentGen = parseGenerations(generations).get(payload.u) || 1;
  if ((payload.g || 1) !== currentGen) return null;
  return payload;
}

export function getCookie(header, name = COOKIE_NAME) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function sessionCookie(value) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearedCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

/** Only same-site hub paths are valid post-login destinations (prevents open redirects). */
export function safeHubRedirect(target) {
  const t = String(target || '');
  if (/^\/dealer-hub\/[A-Za-z0-9\-_/.]*$/.test(t) && !t.includes('..') && !t.startsWith('//')) {
    return t === '/dealer-hub/' ? '/dealer-hub/dashboard/' : t;
  }
  return '/dealer-hub/dashboard/';
}

/** The login page itself is the only public path under /dealer-hub/. */
export function isPublicHubPath(pathname) {
  return pathname === '/dealer-hub' || pathname === '/dealer-hub/' || pathname === '/dealer-hub/index.html';
}
