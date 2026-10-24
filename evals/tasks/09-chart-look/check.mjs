import assert from 'node:assert/strict';

export function args({ fixtures }) {
  return [fixtures.bars({ count: 60, base: 1200 })];
}

const same = (a, b) => String(a).toLowerCase() === b.toLowerCase();

export const checks = [
  ['a light chart', ({ chart, fixtures }) => {
    const ground = chart.getStyleValue('background.color');
    assert.ok(fixtures.lightness(String(ground)) > 0.5, `the ground is ${ground}`);
  }],
  ['rising candles and their wicks in #0a8f5a', ({ chart }) => {
    assert.ok(same(chart.getStyleValue('series.candlestick.upColor'), '#0a8f5a'), `up ${chart.getStyleValue('series.candlestick.upColor')}`);
    assert.ok(same(chart.getStyleValue('series.candlestick.wickUpColor'), '#0a8f5a'), `wick ${chart.getStyleValue('series.candlestick.wickUpColor')}`);
  }],
  ['falling candles and their wicks in #d43c3c', ({ chart }) => {
    assert.ok(same(chart.getStyleValue('series.candlestick.downColor'), '#d43c3c'), `down ${chart.getStyleValue('series.candlestick.downColor')}`);
    assert.ok(same(chart.getStyleValue('series.candlestick.wickDownColor'), '#d43c3c'), `wick ${chart.getStyleValue('series.candlestick.wickDownColor')}`);
  }],
  ['no vertical grid lines', ({ chart }) => assert.equal(chart.getStyleValue('grid.vertical.visible'), false)],
  ['prices in the German way', ({ chart }) => assert.equal(chart.formatPrice(1234.56), '1.234,56')],
];
