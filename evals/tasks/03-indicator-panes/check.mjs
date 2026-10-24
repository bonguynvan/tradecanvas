import assert from 'node:assert/strict';

export function args({ fixtures }) {
  return [fixtures.bars({ count: 200 })];
}

const active = (chart, id) => chart.getActiveIndicators().filter((i) => i.id === id);
/** The pane (0 = the top one under the price) an indicator is in, or -1 on the price itself. */
const paneOf = (chart, instanceId) => chart.getIndicatorPanes().findIndex((p) => p.instanceIds.includes(instanceId));

export const checks = [
  ['EMAs of 21 and 50 on the price', ({ chart }) => {
    const emas = active(chart, 'ema');
    assert.deepEqual(emas.map((i) => Number(i.params.period)).sort((a, b) => a - b), [21, 50]);
    for (const ema of emas) assert.equal(paneOf(chart, ema.instanceId), -1, 'an EMA is in a pane of its own');
  }],
  ['an RSI of 14 in a pane', ({ chart }) => {
    const [rsi] = active(chart, 'rsi');
    assert.ok(rsi, 'no RSI');
    assert.equal(Number(rsi.params.period), 14);
    assert.ok(paneOf(chart, rsi.instanceId) >= 0, 'the RSI is on the price');
  }],
  ['MACD 12, 26, 9', ({ chart }) => {
    const [macd] = active(chart, 'macd');
    assert.ok(macd, 'no MACD');
    assert.deepEqual([macd.params.fast, macd.params.slow, macd.params.signal].map(Number), [12, 26, 9]);
  }],
  ['MACD in its own pane, under the RSI', ({ chart }) => {
    const rsi = paneOf(chart, active(chart, 'rsi')[0]?.instanceId);
    const macd = paneOf(chart, active(chart, 'macd')[0]?.instanceId);
    assert.ok(rsi >= 0 && macd > rsi, `RSI pane ${rsi}, MACD pane ${macd}`);
  }],
];
