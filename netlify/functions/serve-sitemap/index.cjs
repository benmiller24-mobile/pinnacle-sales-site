/**
 * Serve sitemap XML from the build payload so Pretty URLs / trailingSlash
 * cannot turn *.xml or *.xml/ into HTML or a 301.
 *
 * Public paths are 200-rewritten here (force=true). event.path is the
 * original request path (/sitemap-index.xml, /sitemap-0.xml/, …).
 */
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const ALLOWED = new Set([
  'sitemap-index.xml',
  'sitemap-0.xml',
  'sitemap.xml',
  'video-sitemap.xml',
]);

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=UTF-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
};

function loadSitemaps() {
  try {
    return require('./sitemaps.json');
  } catch {
    const dist = join(process.cwd(), 'dist');
    const out = {};
    for (const name of ALLOWED) {
      const p = join(dist, name);
      if (existsSync(p)) out[name] = readFileSync(p, 'utf8');
    }
    if (!Object.keys(out).length) {
      throw new Error('Sitemap payload missing. Run npm run build first.');
    }
    return out;
  }
}

function resolveName(event) {
  const qs = event && event.queryStringParameters && event.queryStringParameters.file;
  if (qs && ALLOWED.has(qs)) return qs;

  const raw = (event && event.path) || '';
  const cleaned = raw.split('?')[0].replace(/\/+$/, '');
  const base = cleaned.split('/').pop();
  if (ALLOWED.has(base)) return base;

  return 'sitemap-index.xml';
}

exports.handler = async (event) => {
  const sitemaps = loadSitemaps();
  const name = resolveName(event);
  const body = sitemaps[name];
  if (!body) {
    return { statusCode: 404, headers: XML_HEADERS, body: '<?xml version="1.0" encoding="UTF-8"?><error>Not found</error>' };
  }
  return { statusCode: 200, headers: XML_HEADERS, body };
};

exports.resolveName = resolveName;
exports.ALLOWED = ALLOWED;
