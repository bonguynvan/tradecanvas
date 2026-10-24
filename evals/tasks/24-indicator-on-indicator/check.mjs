import assert from 'node:assert/strict';

export function args({ fixtures }) {
  return [fixtures.bars({ count: 160, seed: 89 })];
}

const first = (point) => (point && typeof point === 'object' ? Object.values(point).find((v) => typeof v === 'number') : undefined);
const series = (chart, id) => (chart.getIndicatorOutput(id)?.series ?? []).map(first);
const paneOf = (chart, id) => chart.getIndicatorPanes().findIndex((p) => p.instanceIds.includes(id));

export const checks = [
  ['an RSI of 14 in a pane', ({ chart }) => {
    const rsi = chart.getActiveIndicators().find((i) => i.id === 'rsi');
    assert.ok(rsi && Number(rsi.params.period) === 14, 'no RSI(14)');
    assert.ok(paneOf(chart, rsi.instanceId) >= 0, 'the RSI is on the price');
  }],
  ['an SMA of 9 of the RSI line, not of the price', ({ chart }) => {
    const rsi = chart.getActiveIndicators().find((i) => i.id === 'rsi');
    const sma = chart.getActiveIndicators().find((i) => i.id === 'sma' && Number(i.params.period) === 9);
    assert.ok(sma, 'no SMA(9)');
    const r = series(chart, rsi.instanceId);
    const s = series(chart, sma.instanceId);
    const last = r.length - 1;
    const mean = r.slice(last - 8, last + 1).reduce((a, b) => a + b, 0) / 9;
    assert.ok(Math.abs(s[last] - mean) < 1e-6, `the SMA's last value ${s[last]} is not the RSI's 9-bar mean ${mean}`);
  }],
  ['both in the same pane', ({ chart }) => {
    const rsi = chart.getActiveIndicators().find((i) => i.id === 'rsi');
    const sma = chart.getActiveIndicators().find((i) => i.id === 'sma');
    assert.ok(sma && paneOf(chart, rsi.instanceId) === paneOf(chart, sma.instanceId), 'the SMA is not in the RSI’s pane');
  }],
];
