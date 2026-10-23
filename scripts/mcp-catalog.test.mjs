// The MCP catalog read from the code (needs `pnpm build` first, as CI runs it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpCatalog } from './mcp-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = await buildMcpCatalog(ROOT, []);
const option = (entry, name) => catalog.options[entry].find((o) => o.name === name);

test('reads what each constructor takes, beyond its options interface: Chart\'s plugins', () => {
  assert.ok(option('Chart', 'plugins'), 'plugins');
  assert.match(option('Chart', 'plugins').doc, /Plugins/);
  assert.ok(option('ChartWidget', 'chartOptions'));
  assert.ok(option('ChartWidgetGrid', 'cells'));
});

test('reads ChartWidget\'s chartOptions by its own type, which has no plugins', () => {
  const names = catalog.nested['ChartWidget.chartOptions'].map((o) => o.name);
  assert.ok(names.includes('renderer'));
  assert.ok(!names.includes('plugins'));
});

test('keeps a union in the order it is written', () => {
  assert.deepEqual(catalog.timeframes.slice(0, 5), ['1s', '5s', '15s', '30s', '1m']);
  assert.deepEqual(option('Chart', 'renderer').values, ['canvas', 'webgl', 'auto']);
  assert.equal(option('Chart', 'chartType').values[0], 'candlestick');
});

test('reads a union of numbers as values', () => {
  assert.deepEqual(option('ChartWidget', 'weekStartsOn').values, [0, 1]);
  assert.equal(option('ChartWidget', 'weekStartsOn').kind, undefined);
});

test('reads an array of a union as the values of its items', () => {
  assert.equal(option('ChartWidget', 'chartTypes').items[0], 'candlestick');
});

test('leaves doc comments out of the type text, and import() prefixes', () => {
  for (const entry of Object.keys(catalog.options)) {
    for (const o of catalog.options[entry]) {
      assert.doesNotMatch(o.type, /\/\*|import\(/, `${entry}.${o.name}: ${o.type}`);
    }
  }
});

test('knows which languages the widget has before registerWidgetLocales()', () => {
  const builtIn = catalog.languages.filter((l) => l.builtIn).map((l) => l.code);
  assert.deepEqual(builtIn.sort(), ['en', 'vi']);
  assert.ok(catalog.languages.length >= 30);
});

test('lists the drawing tools and feature switches from the built packages', () => {
  assert.ok(catalog.drawingTools.some((t) => t.type === 'trendLine' && t.anchors === 2));
  assert.ok(catalog.widgetFeatures.includes('toolbar.screenshot'));
  assert.ok(catalog.nested['Chart.features'].some((o) => o.name === 'drawings'));
});
