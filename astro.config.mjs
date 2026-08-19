// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// 本番URL。独自ドメインに切り替える際はこの1行だけ書き換えればよい
// （canonical URL・sitemap.xml・robots.txt・OGPのog:urlはすべてここから自動生成される）
const SITE_URL = 'https://warikan-6zt.pages.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [
    preact(),
    sitemap({
      // "/" はツール本体（/tools/warikan/）へのリダイレクト専用ページのため、
      // 実体のあるページのみをsitemapに載せる
      filter: (page) => page !== `${SITE_URL}/`,
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
