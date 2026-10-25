// What a page downloads to show a chart: each entry bundled from the built
// packages as an app's bundler would (minified, tree-shaken, split), and the
// code it needs at the start, against what it may load later.
//
//   pnpm build && node scripts/size-report.mjs [--json]
//
// Per entry it prints, in kB of 1,000 bytes as Vite and the browser count them:
//   first    the entry and the chunks it imports statically: what runs at the start
//   later    the chunks it imports with import(): today the WebGL renderer,
//            loaded when the chart's `renderer` is 'webgl' or 'auto'
//   gzip, br each chunk compressed on its own, as a server sends files:
//            gzip at its best level (-9) and Brotli at Node's default quality
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIBRARY = join(ROOT, 'packages/library');
const JSON_OUT = process.argv.includes('--json');

if (!existsSync(join(LIBRARY, 'dist/index.js'))) throw new Error('packages/library/dist is missing: run pnpm build first');

/** The package's entry points, from its export map: `@tradecanvas/chart/widget` → dist/widget/index.js. */
function aliases() {
  const { name, exports } = JSON.parse(readFileSync(join(LIBRARY, 'package.json'), 'utf8'));
  return Object.entries(exports)
    .map(([sub, targets]) => ({ specifier: sub === '.' ? name : `${name}${sub.slice(1)}`, file: join(LIBRARY, targets.import) }))
    // The longest first, so `…/widget/locales` isn't taken for `…/widget`.
    .sort((a, b) => b.specifier.length - a.specifier.length)
    .map(({ specifier, file }) => ({ find: new RegExp(`^${specifier.replace(/[/.]/g, '\\$&')}$`), replacement: file }));
}

// What an app writes to get each part on screen.
const ENTRIES = [
  { id: 'chart', label: 'new Chart()', code: `import { Chart } from '@tradecanvas/chart';\nexport const make = (el) => new Chart(el, {});\n` },
  { id: 'widget', label: 'new ChartWidget()', code: `import { ChartWidget } from '@tradecanvas/chart/widget';\nexport const make = (el) => new ChartWidget(el, {});\n` },
  {
    id: 'widget-ja',
    label: 'new ChartWidget(), one more language',
    code: `import { ChartWidget, registerWidgetLocale } from '@tradecanvas/chart/widget';\nimport { ja } from '@tradecanvas/chart/widget/locales';\nregisterWidgetLocale('ja', ja);\nexport const make = (el) => new ChartWidget(el, { locale: 'ja' });\n`,
  },
  {
    id: 'widget-all-languages',
    label: 'new ChartWidget(), every language',
    code: `import { ChartWidget } from '@tradecanvas/chart/widget';\nimport { registerWidgetLocales } from '@tradecanvas/chart/widget/locales';\nregisterWidgetLocales();\nexport const make = (el) => new ChartWidget(el, {});\n`,
  },
  {
    id: 'all',
    label: 'the whole package',
    code: `export * from '@tradecanvas/chart';\nexport * from '@tradecanvas/chart/widget';\nexport * from '@tradecanvas/chart/widget/locales';\n`,
  },
];

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

/** The entry chunk and every chunk it reaches through static imports. */
function loadedFirst(chunks) {
  const byName = new Map(chunks.map((c) => [c.fileName, c]));
  const first = new Set();
  const visit = (chunk) => {
    if (!chunk || first.has(chunk.fileName)) return;
    first.add(chunk.fileName);
    for (const name of chunk.imports) visit(byName.get(name));
  };
  visit(chunks.find((c) => c.isEntry));
  return first;
}

function sizes(list) {
  return list.reduce((acc, c) => {
    const bytes = Buffer.from(c.code);
    return {
      raw: acc.raw + bytes.length,
      gzip: acc.gzip + gzipSync(bytes, { level: 9 }).length,
      brotli: acc.brotli + brotliCompressSync(bytes).length,
    };
  }, { raw: 0, gzip: 0, brotli: 0 });
}

/** Bundle one entry and sort its chunks into those loaded at the start and later. */
async function measure(entry, dir, alias) {
  const file = join(dir, `${entry.id}.js`);
  writeFileSync(file, entry.code);
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root: dir,
    resolve: { alias },
    build: {
      write: false,
      minify: true,
      target: 'es2022',
      modulePreload: false,
      // An app's entry exports nothing; these do, so that what they import is
      // kept. Without it the bundler drops the exports and everything with them.
      rollupOptions: { input: file, output: { format: 'es' }, preserveEntrySignatures: 'strict' },
    },
  });
  const chunks = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output).filter((o) => o.type === 'chunk');
  const first = loadedFirst(chunks);
  const row = {
    id: entry.id,
    label: entry.label,
    first: sizes(chunks.filter((c) => first.has(c.fileName))),
    later: sizes(chunks.filter((c) => !first.has(c.fileName))),
    chunks: chunks.length,
  };
  if (row.first.raw < 1000) throw new Error(`${entry.id}: ${row.first.raw} bytes at the start, the entry was emptied`);
  return row;
}

const alias = aliases();
const dir = mkdtempSync(join(tmpdir(), 'tc-size-'));
try {
  const rows = [];
  for (const entry of ENTRIES) rows.push(await measure(entry, dir, alias));
  if (JSON_OUT) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log('| Entry | First | gzip | br | Later | gzip | br | Chunks |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      const cells = [r.first, r.later].flatMap((s) => [kb(s.raw), kb(s.gzip), kb(s.brotli)]);
      console.log(`| ${r.label} | ${cells.join(' | ')} | ${r.chunks} |`);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
}
