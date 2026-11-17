// @vitest-environment node
// The badge goes in the footer of pages that show no chart, so importing it must
// not bring the chart's engine: an app bundles `import { PoweredBy } from
// '@tradecanvas/svelte'` and gets the badge and Svelte, nothing more.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { build, type Rollup } from 'vite';
import { describe, expect, it } from 'vitest';

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * The badge and Svelte's client runtime come to about 20 kB gzipped; before the
 * badge had an entry of its own the same app took 82 kB, the chart's core among
 * them. The budget leaves room for Svelte to grow.
 */
const BADGE_BUDGET_GZIP = 40_000;

async function bundle(code: string): Promise<Rollup.OutputChunk[]> {
  // Inside the package, so the app's `import 'svelte'` finds the package's Svelte.
  const dir = mkdtempSync(join(PACKAGE, 'node_modules', '.tc-badge-'));
  try {
    const entry = join(dir, 'app.js');
    writeFileSync(entry, code);
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: dir,
      plugins: [svelte({ hot: false, configFile: false })],
      resolve: { alias: [{ find: /^@tradecanvas\/svelte$/, replacement: join(PACKAGE, 'src/index.ts') }] },
      build: { write: false, minify: true, target: 'es2022', modulePreload: false, rollupOptions: { input: entry } },
    });
    const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
    return outputs.flatMap((r) => r.output).filter((o): o is Rollup.OutputChunk => o.type === 'chunk');
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
}

const gzip = (chunks: Rollup.OutputChunk[]): number => chunks.reduce((n, c) => n + gzipSync(c.code, { level: 9 }).length, 0);

describe('<PoweredBy> in an app with no chart', () => {
  it('brings the badge and Svelte, not the chart', async () => {
    const chunks = await bundle(
      `import { mount } from 'svelte';\nimport { PoweredBy } from '@tradecanvas/svelte';\nmount(PoweredBy, { target: document.body });\n`,
    );
    const code = chunks.map((c) => c.code).join('\n');
    expect(code).toContain('Powered by');
    // Names the core's indicators and the chart carry as strings, which minifying keeps.
    expect(code.includes('Bollinger'), 'the chart\'s core came with the badge').toBe(false);
    expect(gzip(chunks), 'gzipped bytes').toBeLessThan(BADGE_BUDGET_GZIP);
  }, 60_000);
});
