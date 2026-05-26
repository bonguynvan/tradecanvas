import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV !== 'production';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: '../docs',
      assets: '../docs',
      fallback: '404.html',
      precompress: false,
      strict: true,
    }),
    paths: {
      base: dev ? '' : '/tradecanvas',
    },
    prerender: {
      handleHttpError: 'warn',
    },
    alias: {
      '@tradecanvas/chart/widget': '../packages/library/src/widget/index.ts',
      '@tradecanvas/chart': '../packages/library/src/index.ts',
      '@tradecanvas/core': '../packages/core/src/index.ts',
      '@tradecanvas/commons': '../packages/commons/src/index.ts',
      '@tradecanvas/analytics': '../packages/analytics/src/index.ts',
    },
  },
};
