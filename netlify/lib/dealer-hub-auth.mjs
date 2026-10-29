// Shared Dealer Hub auth helpers (Node). Used by the login/logout functions
// and by scripts/dealer-hub-users.mjs. No secrets live in this file.
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

export const USERS_STORE = 'dealer-hub-users';
export const SESSION_COOKIE = 'ph_session';
export const SESSION_TTL_S = 30 * 24 * 60 * 60; // 30 days

// scrypt parameters: N=2^15, r=8, p=1 (~32 MB, ~50-100 ms per check).
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

export function normalizeUsername(u) {
  return String(u || '').trim().toLowerCase();
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(String(password), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

// A fixed, valid hash used to spend the same time on unknown usernames, so
// response timing doesn't reveal which accounts exist.
const DUMMY_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(KEYLEN).toString('base64')}`;

export async function verifyPassword(password, stored) {
  const parts = String(stored || DUMMY_HASH).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(String(password), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return stored ? timingSafeEqual(actual, expected) : false;
}

export function generatePassword() {
  // 4 groups of 4 from an unambiguous alphabet: e.g. "k7mq-2xwd-9pfh-r3tn" (~80 bits).
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) {
    if (i && i % 4 === 0) out += '-';
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function signSession({ username, displayName }, secret) {
  const payload = b64url(
    JSON.stringify({ u: username, n: displayName, x: Math.floor(Date.now() / 1000) + SESSION_TTL_S })
  );
  const sig = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}
