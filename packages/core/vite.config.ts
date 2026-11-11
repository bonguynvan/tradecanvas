import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

const WORKER_MAP_FILE = /^assets\/indicator\.worker-[\w-]+\.js\.map$/;
// The comment ending the worker's script, as it sits escaped in the string the chunk inlines.
const WORKER_MAP_COMMENT = /\\n\/\/# sourceMappingURL=indicator\.worker-[\w-]+\.js\.map/g;

/**
 * The indicator worker is inlined and started from a Blob URL, where no
 * sourcemap beside it can be found, and Vite maps worker bundles whenever
 * the build is mapped. Drop the map it writes for the worker (it would ship
 * in `dist/assets`) and the comment pointing at it inside the inlined script.
 */
function inlineWorkerWithoutSourcemap(): Plugin {
  return {
    name: 'tc-inline-worker-without-sourcemap',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [name, file] of Object.entries(bundle)) {
        if (WORKER_MAP_FILE.test(name)) delete bundle[name];
        else if (file.type === 'chunk' && name.startsWith('indicator.worker-')) file.code = file.code.replace(WORKER_MAP_COMMENT, '');
      }
    },
  };
}

export default defineConfig({
  plugins: [
    dts({ tsconfigPath: './tsconfig.json' }),
    inlineWorkerWithoutSourcemap(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChartLibCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['@tradecanvas/commons'],
    },
    sourcemap: true,
    target: 'es2022',
  },
});
