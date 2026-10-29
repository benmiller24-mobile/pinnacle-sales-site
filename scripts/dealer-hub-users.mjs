#!/usr/bin/env node
// Manage Dealer Hub accounts (stored hashed in the Netlify Blobs store
// `dealer-hub-users` on the pinnaclewebsiterep site).
//
// Setup (once, on your machine):
//   export NETLIFY_SITE_ID=21274407-dd99-4e6f-a024-a9445bacf3f5
//   export NETLIFY_AUTH_TOKEN=<personal access token: app.netlify.com/user/applications>
//
// Usage:
//   node scripts/dealer-hub-users.mjs add   <username> "<Display Name>"   # prints a new password once
//   node scripts/dealer-hub-users.mjs reset <username>                    # prints a new password once
//   node scripts/dealer-hub-users.mjs remove <username>
//   node scripts/dealer-hub-users.mjs list
//   node scripts/dealer-hub-users.mjs import <accounts.csv> > new-passwords.csv
//       CSV columns: username,displayName  (header row required)
//       Writes username,displayName,password to stdout — send each dealer
//       their own line, then delete the file.
//
// Passwords are generated here, shown once, and only their scrypt hashes are
// stored. Nothing is written to the repo.
import { readFileSync } from 'node:fs';
import { getStore } from '@netlify/blobs';
import { USERS_STORE, normalizeUsername, hashPassword, generatePassword } from '../netlify/lib/dealer-hub-auth.mjs';

const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!siteID || !token) {
  console.error('Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN first (see the header of this file).');
  process.exit(1);
}
const store = getStore({ name: USERS_STORE, siteID, token });

function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function setAccount(username, displayName) {
  const password = generatePassword();
  await store.setJSON(username, { displayName, hash: await hashPassword(password), updatedAt: new Date().toISOString() });
  return password;
}

const [cmd, a1, a2] = process.argv.slice(2);

switch (cmd) {
  case 'add': {
    const username = normalizeUsername(a1);
    if (!username || !a2) throw new Error('Usage: add <username> "<Display Name>"');
    const password = await setAccount(username, a2);
    console.log(`${username}  →  ${password}`);
    break;
  }
  case 'reset': {
    const username = normalizeUsername(a1);
    const existing = await store.get(username, { type: 'json' });
    if (!existing) throw new Error(`No account: ${username}`);
    const password = await setAccount(username, existing.displayName || username);
    console.log(`${username}  →  ${password}`);
    break;
  }
  case 'remove': {
    const username = normalizeUsername(a1);
    await store.delete(username);
    console.log(`Removed ${username}`);
    break;
  }
  case 'list': {
    const { blobs } = await store.list();
    for (const b of blobs) {
      const acct = await store.get(b.key, { type: 'json' });
      console.log(`${b.key}\t${acct?.displayName || ''}\t${acct?.updatedAt || ''}`);
    }
    break;
  }
  case 'import': {
    if (!a1) throw new Error('Usage: import <accounts.csv>');
    const [header, ...rows] = parseCsv(readFileSync(a1, 'utf8'));
    const ui = header.findIndex((h) => h.toLowerCase() === 'username');
    const ni = header.findIndex((h) => h.toLowerCase() === 'displayname');
    if (ui < 0 || ni < 0) throw new Error('CSV needs a header row with username,displayName');
    console.log('username,displayName,password');
    for (const r of rows) {
      const username = normalizeUsername(r[ui]);
      if (!username) continue;
      const password = await setAccount(username, r[ni] || username);
      console.log([username, r[ni] || username, password].map(csvCell).join(','));
    }
    break;
  }
  default:
    console.error('Commands: add | reset | remove | list | import   (see header of this file)');
    process.exit(1);
}
