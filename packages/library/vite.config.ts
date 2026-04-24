import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({ tsconfigPath: './tsconfig.json' }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'widget/index': resolve(__dirname, 'src/widget/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Keep sibling packages external — they're published as separate npm
      // packages under the same scope. Consumer's bundler handles the import.
      external: ['@tradecanvas/commons', '@tradecanvas/core'],
    },
    sourcemap: true,
    target: 'es2022',
  },
});
