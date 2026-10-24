import assert from 'node:assert/strict';

export function args({ fixtures }) {
  return [fixtures.bars({ count: 80, seed: 53 })];
}

export const checks = [
  ['the Terminal look', ({ result }) => assert.equal(result.getUI().preset, 'terminal')],
  ['the toolbar floats', ({ result }) => assert.equal(result.getUI().toolbar, 'floating')],
  ['chosen buttons solid', ({ result }) => assert.equal(result.getUI().active, 'solid')],
  ['a light theme', ({ chart, fixtures }) => assert.ok(fixtures.lightness(chart.getStyleValue('background.color')) > 0.5, `ground ${chart.getStyleValue('background.color')}`)],
  ['the bars are on its chart', ({ chart }) => assert.equal(chart.getData().length, 80)],
];
