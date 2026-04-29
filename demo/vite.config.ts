import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  base: '/tradecanvas/',
  build: {
    outDir: resolve(__dirname, '../docs'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@tradecanvas/chart/widget': resolve(__dirname, '../packages/library/src/widget/index.ts'),
      '@tradecanvas/chart': resolve(__dirname, '../packages/library/src/index.ts'),
      '@tradecanvas/core': resolve(__dirname, '../packages/core/src/index.ts'),
      '@tradecanvas/commons': resolve(__dirname, '../packages/commons/src/index.ts'),
    },
  },
});
