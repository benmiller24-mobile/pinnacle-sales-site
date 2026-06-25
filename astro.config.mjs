import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pinnaclesales.biz',
  integrations: [sitemap({ filter: (page) => !page.includes('/dealer-hub/') })],
  trailingSlash: 'always',
});
