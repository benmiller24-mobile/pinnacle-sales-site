import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

// @astrojs/sitemap emits sitemap-index.xml + sitemap-0.xml, never sitemap.xml.
// After generate:
//   1. Point the index loc at the trailing-slash urlset (GSC/Netlify workaround).
//   2. Copy the urlset to /sitemap.xml so the default crawler path lists pages.
//   3. Bundle XML into the Netlify function so Pretty URLs cannot rewrite *.xml/.
function prepareSitemapsForGsc() {
  return {
    name: 'prepare-sitemaps-for-gsc',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const indexFile = join(outDir, 'sitemap-index.xml');
        const urlsetFile = join(outDir, 'sitemap-0.xml');
        const alias = join(outDir, 'sitemap.xml');
        const videoFile = join(outDir, 'video-sitemap.xml');

        if (!existsSync(indexFile) || !existsSync(urlsetFile)) {
          throw new Error('Expected sitemap-index.xml and sitemap-0.xml after build');
        }
        if (!existsSync(videoFile)) {
          throw new Error('Expected video-sitemap.xml in dist (copied from public/)');
        }

        let indexXml = readFileSync(indexFile, 'utf8');
        indexXml = indexXml.replace(
          /https:\/\/pinnaclesales\.biz\/sitemap-0\.xml(?!\/)/g,
          'https://pinnaclesales.biz/sitemap-0.xml/',
        );
        writeFileSync(indexFile, indexXml);
        copyFileSync(urlsetFile, alias);

        const functionDir = join(rootDir, 'netlify/functions/serve-sitemap');
        mkdirSync(functionDir, { recursive: true });
        const payload = {
          'sitemap-index.xml': indexXml,
          'sitemap-0.xml': readFileSync(urlsetFile, 'utf8'),
          'sitemap.xml': readFileSync(alias, 'utf8'),
          'video-sitemap.xml': readFileSync(videoFile, 'utf8'),
        };
        for (const [name, xml] of Object.entries(payload)) {
          if (!xml.includes('<urlset') && !xml.includes('<sitemapindex')) {
            throw new Error(`${name} is not a sitemap urlset/index`);
          }
        }
        writeFileSync(join(functionDir, 'sitemaps.json'), JSON.stringify(payload));
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
    prepareSitemapsForGsc(),
  ],
});
