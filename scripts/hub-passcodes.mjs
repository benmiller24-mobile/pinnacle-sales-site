#!/usr/bin/env node
// Dealer Hub passcode tool. Run it on your own computer — never paste passcodes into the repo.
//
//   node scripts/hub-passcodes.mjs secret
//       Prints a new random DEALER_HUB_SECRET to paste into Netlify (one time, or to sign everyone out).
//
//   DEALER_HUB_SECRET=… node scripts/hub-passcodes.mjs issue "Dealer Username" ["Another Dealer" …]
//       Prints each dealer's passcode. Same secret + same username → same passcode every time.
//
//   DEALER_HUB_SECRET=… node scripts/hub-passcodes.mjs migrate path/to/old-dealer-hub-index.html > hub-passcodes.csv
//       Reads the old CREDENTIALS list from the previous login page and writes a CSV of
//       username, display name, NEW passcode — the list to send to dealers. Delete the CSV after.
//       Get the old page with:  git show <commit-before-this-change>:public/dealer-hub/index.html > old-hub.html
//
// Optional env (must match Netlify): DEALER_HUB_GENERATIONS="username=2" to re-issue one dealer's passcode.

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { derivePasscode, formatPasscode, normalizeUsername, parseGenerations } from '../netlify/shared/hub-auth.mjs';

const [, , command, ...args] = process.argv;
const secret = process.env.DEALER_HUB_SECRET;
const generations = parseGenerations(process.env.DEALER_HUB_GENERATIONS);

function csv(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function passcodeFor(username) {
  const gen = generations.get(normalizeUsername(username)) || 1;
  return formatPasscode(await derivePasscode(secret, username, gen));
}

function requireSecret() {
  if (!secret || secret.length < 32) {
    console.error('Set DEALER_HUB_SECRET (32+ characters) to the same value as in Netlify first.');
    process.exit(1);
  }
}

if (command === 'secret') {
  console.log(randomBytes(32).toString('base64url'));
} else if (command === 'issue') {
  requireSecret();
  if (!args.length) { console.error('Usage: issue "Dealer Username" …'); process.exit(1); }
  for (const name of args) console.log(`${name}\t${await passcodeFor(name)}`);
} else if (command === 'migrate') {
  requireSecret();
  const file = args[0];
  if (!file) { console.error('Usage: migrate path/to/old-index.html'); process.exit(1); }
  const html = readFileSync(file, 'utf8');
  const block = html.match(/CREDENTIALS\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!block) { console.error('No CREDENTIALS list found in that file.'); process.exit(1); }
  const entries = [...block[1].matchAll(/\{([^{}]*)\}/g)].map((m) => {
    const field = (k) => (m[1].match(new RegExp(`${k}\\s*:\\s*(['"])(.*?)\\1`)) || [])[2] || '';
    return { username: field('username'), displayName: field('displayName') };
  }).filter((e) => e.username);
  console.log('username,display_name,new_passcode');
  for (const e of entries) console.log([e.username, e.displayName, await passcodeFor(e.username)].map(csv).join(','));
  console.error(`${entries.length} dealers. Send each their new passcode, then delete this CSV.`);
} else {
  console.error('Commands: secret | issue "Username" … | migrate old-index.html');
  process.exit(1);
}
