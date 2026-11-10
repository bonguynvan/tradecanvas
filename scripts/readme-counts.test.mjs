// The counts the READMEs give (indicators, drawing tools, chart types) are the
// ones the code has. The banner carries no counts, as an image never follows a
// release; the text does, and this keeps it current in every language.
// Needs `pnpm build` first, as CI runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpCatalog } from './mcp-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const indicators = JSON.parse(readFileSync(join(ROOT, 'demo/src/lib/generated/indicators.json'), 'utf8'));
const catalog = await buildMcpCatalog(ROOT, []);

const COUNTS = {
  indicators: indicators.length,
  drawingTools: catalog.drawingTools.length,
  chartTypes: catalog.chartTypes.length,
};

// How each README writes a count: the number, then the words for what it counts.
const WORDS = {
  'README.md': { indicators: 'indicators', drawingTools: 'drawing tools', chartTypes: 'chart types' },
  'README.vi.md': { indicators: 'chỉ báo', drawingTools: 'công cụ vẽ', chartTypes: 'loại biểu đồ' },
  'README.zh-CN.md': { indicators: '个指标', drawingTools: '种画线工具', chartTypes: '种图表' },
  'README.ja.md': { indicators: '(?:種類の|の)インジケーター', drawingTools: '(?:種類の|の)描画ツール', chartTypes: '種類のチャート' },
  'README.ko.md': { indicators: '개 지표', drawingTools: '(?:개|가지) (?:그리기|드로잉) 도구', chartTypes: '가지 차트' },
  'README.es.md': { indicators: 'indicadores', drawingTools: 'herramientas de dibujo', chartTypes: 'tipos de gráfico' },
};

/** Every number a README gives for `what`, in the order it gives them. */
function countsIn(text, words) {
  return [...text.matchAll(new RegExp(`(\\d+) ?${words}`, 'g'))].map((m) => Number(m[1]));
}

test('reads a count in each language\'s wording', () => {
  assert.deepEqual(countsIn('134 indicators, 73 drawing tools', WORDS['README.md'].drawingTools), [73]);
  assert.deepEqual(countsIn('134개 지표, 69가지 드로잉 도구', WORDS['README.ko.md'].drawingTools), [69]);
  assert.deepEqual(countsIn('18 種類のチャート、134 のインジケーター', WORDS['README.ja.md'].indicators), [134]);
});

for (const [file, words] of Object.entries(WORDS)) {
  test(`${file} gives the counts the code has`, () => {
    const text = readFileSync(join(ROOT, file), 'utf8');
    for (const [what, count] of Object.entries(COUNTS)) {
      const found = countsIn(text, words[what]);
      assert.ok(found.length > 0, `${file} gives no count of ${what}`);
      assert.deepEqual(found, found.map(() => count), `${file}: ${what} is ${count}, the README says ${found.join(', ')}`);
    }
  });
}
