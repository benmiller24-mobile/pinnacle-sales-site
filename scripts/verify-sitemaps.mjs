/**
 * Local check: dist XML + Netlify function payload/handler.
 * Does not hit production and is not a proxy for GSC (WebFetch 500 is not either).
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fnPath = join(root, 'netlify/functions/serve-sitemap/index.cjs');
const require = createRequire(fnPath);
const { handler, ALLOWED } = require(fnPath);

const PATHS = [
  '/sitemap-index.xml',
  '/sitemap-index.xml/',
  '/sitemap-0.xml',
  '/sitemap-0.xml/',
  '/sitemap.xml',
  '/sitemap.xml/',
  '/video-sitemap.xml',
  '/video-sitemap.xml/',
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function looksLikeXmlSitemap(body) {
  const text = String(body).trimStart();
  return (
    text.startsWith('<?xml') &&
    (text.includes('<urlset') || text.includes('<sitemapindex')) &&
    !/<html[\s>]/i.test(text)
  );
}

const dist = join(root, 'dist');
for (const name of ALLOWED) {
  const file = join(dist, name);
  assert(existsSync(file), `missing ${file}`);
  assert(looksLikeXmlSitemap(readFileSync(file, 'utf8')), `${name} is not valid sitemap XML`);
}

const indexXml = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
assert(
  indexXml.includes('https://pinnaclesales.biz/sitemap-0.xml/'),
  'sitemap-index.xml must point at the trailing-slash urlset',
);

const alias = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
assert(alias.includes('<urlset'), 'sitemap.xml must be the urlset, not the index');
assert(
  alias === readFileSync(join(dist, 'sitemap-0.xml'), 'utf8'),
  'sitemap.xml must match sitemap-0.xml',
);

const robots = readFileSync(join(root, 'public/robots.txt'), 'utf8');
for (const path of PATHS) {
  assert(
    robots.includes(`Sitemap: https://pinnaclesales.biz${path}`),
    `robots.txt missing Sitemap line for ${path}`,
  );
}

const payloadPath = join(root, 'netlify/functions/serve-sitemap/sitemaps.json');
assert(existsSync(payloadPath), 'missing generated sitemaps.json — run npm run build');

for (const path of PATHS) {
  const res = await handler({ path, httpMethod: 'GET', queryStringParameters: {} });
  assert(res.statusCode === 200, `${path} function status ${res.statusCode}`);
  assert(
    res.headers['Content-Type'] === 'application/xml; charset=UTF-8',
    `${path} missing application/xml charset`,
  );
  assert(looksLikeXmlSitemap(res.body), `${path} function body is not sitemap XML`);
}

console.log(`ok: ${PATHS.length} function paths + dist XML + robots Sitemap lines`);
