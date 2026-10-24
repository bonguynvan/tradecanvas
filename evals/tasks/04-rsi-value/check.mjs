import assert from 'node:assert/strict';

const COUNT = 150;

export function args({ fixtures }) {
  return [fixtures.bars({ count: COUNT, seed: 11 })];
}

const close = (a, b) => Math.abs(a - b) < 1e-6;

export const checks = [
  ['an RSI of 14 under the bars', ({ chart }) => {
    const rsi = chart.getActiveIndicators().find((i) => i.id === 'rsi');
    assert.ok(rsi && Number(rsi.params.period) === 14, 'no RSI(14) on the chart');
    assert.ok(chart.getIndicatorPanes().some((p) => p.instanceIds.includes(rsi.instanceId)), 'the RSI is on the price');
  }],
  ['latestRsi() is the RSI at the last bar (Wilder’s)', ({ result, fixtures }) => {
    const expected = fixtures.wilderRsi(fixtures.bars({ count: COUNT, seed: 11 }).map((b) => b.close));
    const got = result.latestRsi();
    assert.ok(typeof got === 'number' && close(got, expected), `got ${got}, the chart's is ${expected}`);
  }],
  ['it follows a change to the last bar', async ({ result, chart, fixtures, wait }) => {
    const data = chart.getData();
    const last = data[data.length - 1];
    const closeNow = last.close * 1.03;
    chart.updateLastBar({ ...last, close: closeNow, high: Math.max(last.high, closeNow) });
    await wait(30);
    const closes = [...fixtures.bars({ count: COUNT, seed: 11 }).map((b) => b.close).slice(0, -1), closeNow];
    const got = result.latestRsi();
    const expected = fixtures.wilderRsi(closes);
    assert.ok(typeof got === 'number' && close(got, expected), `got ${got} after the change, expected ${expected}`);
  }],
];
