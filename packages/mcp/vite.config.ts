import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import dts from 'vite-plugin-dts';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string };

export default defineConfig({
  // The server reports the version it was published as.
  define: {
    __TC_MCP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      // The catalog's declaration is the whole JSON again; nothing imports it from outside.
      beforeWriteFile: (filePath) => (filePath.endsWith('catalog.json.d.ts') ? false : undefined),
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@tradecanvas/commons', /^node:/],
      output: {
        // `npx @tradecanvas/mcp` runs dist/cli.js as a program.
        banner: (chunk) => (chunk.name === 'cli' ? '#!/usr/bin/env node' : ''),
        chunkFileNames: 'server.js',
      },
    },
    target: 'node20',
    minify: false,
  },
});
