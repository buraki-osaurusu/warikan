// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: 本番ドメインが決まったら実際のURLに差し替える（sitemap.xml / canonical URLの生成に使用）
  site: 'https://warikan.example.com',
  integrations: [preact(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});