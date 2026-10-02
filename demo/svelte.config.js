import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV !== 'production';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html',
      precompress: false,
      strict: true,
    }),
    paths: {
      base: dev ? '' : '/tradecanvas',
      // Root-relative links: the language switcher and hreflang strip `base`
      // from the URL, which a relative base ('../..') would not match.
      relative: false,
    },
    prerender: {
      handleHttpError: 'warn',
    },
    alias: {
      // The widget's languages one file each, so a page loads only its own (see lib/i18n/widget.ts).
      '$widget-locales': '../packages/library/src/widget/locales',
      '@tradecanvas/chart/widget/locales': '../packages/library/src/widget/locales/index.ts',
      '@tradecanvas/chart/widget': '../packages/library/src/widget/index.ts',
      '@tradecanvas/chart': '../packages/library/src/index.ts',
      '@tradecanvas/core': '../packages/core/src/index.ts',
      '@tradecanvas/commons': '../packages/commons/src/index.ts',
      '@tradecanvas/analytics': '../packages/analytics/src/index.ts',
    },
  },
};
