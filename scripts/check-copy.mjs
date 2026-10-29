#!/usr/bin/env node
// Build-time copy check. Runs after `astro build` (see package.json "build") and FAILS the
// build — so nothing deploys — if the rendered site contains:
//   * drafting notes that leaked into published copy ("six public brands, not five", "do not pitch it"),
//   * hard-coded footprint claims that drift from src/data/footprint.ts ("10 Western states", Utah),
//   * secrets that must never ship in page source (dealer credential lists).
// Usage: node scripts/check-copy.mjs [dir=dist]
//
// To add a rule, append to RULES. To allow a deliberate exception, add the file path
// (relative to the scanned dir) to that rule's `allow` list with a reason.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dir = process.argv[2] || 'dist';

const RULES = [
  // Drafting notes / internal commentary
  { id: 'internal-note', re: /public brands/i, why: 'internal shorthand ("six public brands") — say what the brands are' },
  { id: 'internal-note', re: /not five\b/i, why: 'drafting correction left in copy' },
  { id: 'internal-note', re: /do not pitch/i, why: 'instruction to a writer, not a reader' },
  { id: 'internal-note', re: /application that converts/i, why: 'internal commentary' },
  { id: 'internal-note', re: /dealer-only WW Wood SKU/i, why: 'internal product note' },
  { id: 'internal-note', re: /each page has a cta/i, why: 'describes the site, not the offer' },
  { id: 'internal-note', re: /short answers a kitchen dealer would search/i, why: 'SEO note' },
  { id: 'internal-note', re: /most applications we want/i, why: 'internal framing' },
  { id: 'internal-note', re: /\b(TODO|FIXME|VERIFY)\b/, why: 'unfinished-copy marker' },
  // Footprint drift — counts and states come from src/data/footprint.ts
  { id: 'footprint', re: /\b(10|ten)[- ](western|state)/i, why: 'hard-coded state count; use WW_STATE_COUNT from src/data/footprint.ts' },
  { id: 'footprint', re: /\bUtah\b|\/territory\/utah/, why: 'Utah is not in the WW Wood footprint (src/data/footprint.ts)' },
  { id: 'footprint', re: /a Pinnacle Sales company|led by Pinnacle Sales/i, why: 'EKD is a separate company' },
  // Secrets
  { id: 'secret', re: /CREDENTIALS\s*=\s*\[/, why: 'client-side credential list' },
  { id: 'secret', re: /\bpassword\s*:\s*['"][^'"]+['"]/i, why: 'plaintext password in page source' },
  { id: 'secret', re: /pat-na\d-[0-9a-f-]{20,}/i, why: 'HubSpot private-app token' },
];

function walk(d, out = []) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(html|xml|txt|json|js)$/.test(name)) out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(dir);
} catch {
  console.error(`check-copy: "${dir}" not found — run astro build first.`);
  process.exit(1);
}

const problems = [];
for (const file of files) {
  const rel = relative(dir, file);
  const text = readFileSync(file, 'utf8');
  for (const rule of RULES) {
    if (rule.allow?.includes(rel)) continue;
    const m = text.match(rule.re);
    if (m) {
      const i = m.index ?? 0;
      const snippet = text.slice(Math.max(0, i - 60), i + m[0].length + 60).replace(/\s+/g, ' ');
      problems.push(`  [${rule.id}] ${rel}: ${rule.why}\n      …${snippet}…`);
    }
  }
}

if (problems.length) {
  console.error(`\ncheck-copy: ${problems.length} problem(s) in ${dir}/ — build stopped so this can't deploy.\n`);
  console.error(problems.join('\n'));
  console.error('\nFix the copy (or the data file) and rebuild.');
  process.exit(1);
}
console.log(`check-copy: ${files.length} files clean.`);
