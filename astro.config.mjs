import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// @astrojs/sitemap emits sitemap-index.xml + sitemap-0.xml, never sitemap.xml.
// Copy the index to /sitemap.xml so the default crawler path is a real 200 file
// (Netlify also 200-rewrites /sitemap.xml → /sitemap-index.xml as a fallback).
function aliasSitemapXml() {
  return {
    name: 'alias-sitemap-xml',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const indexFile = join(outDir, 'sitemap-index.xml');
        const alias = join(outDir, 'sitemap.xml');
        if (existsSync(indexFile)) {
          copyFileSync(indexFile, alias);
        }
      },
    },
  };
}

export default defineConfig({
  site: 'https://pinnaclesales.biz',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/dealer-hub/') && !page.includes('/thank-you-'),
      serialize(item) {
        // Canonical locs are non-www with a trailing slash. Never list no-slash twins.
        if (item.url && !item.url.endsWith('/')) {
          item.url += '/';
        }
        return item;
      },
    }),
    aliasSitemapXml(),
  ],
});
