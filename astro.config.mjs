import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.pinnaclesales.biz',
  integrations: [sitemap()],
  trailingSlash: 'never',
});
