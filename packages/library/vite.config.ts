import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import dts from 'vite-plugin-dts';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

export default defineConfig({
  // Inject the real package version at build time so `Chart.version` can never
  // drift from package.json again. Replaced literally; falls back to a dev
  // sentinel when bundled outside Vite (e.g. ts-node).
  define: {
    __TC_VERSION__: JSON.stringify(pkg.version),
  },
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
