import assert from 'node:assert/strict';

const COUNT = 60;
const history = (fixtures) => fixtures.bars({ count: COUNT, step: fixtures.MINUTE });

export function args({ fixtures }) {
  return [history(fixtures)];
}

/** Count the answer's setData calls from here on: a feed rebuilding the series per trade stutters. */
function watchSetData(chart) {
  if (chart.__setDataCalls !== undefined) return;
  chart.__setDataCalls = 0;
  const original = chart.setData.bind(chart);
  chart.setData = (...a) => {
    chart.__setDataCalls++;
    return original(...a);
  };
}

const last = (chart) => chart.getData()[chart.getData().length - 1];

export const checks = [
  ['the history is on the chart', ({ chart }) => assert.equal(chart.getData().length, COUNT)],
  ['a trade in the last minute updates its candle', async ({ result, chart, fixtures, wait }) => {
    watchSetData(chart);
    const bar = history(fixtures)[COUNT - 1];
    const before = last(chart);
    result.onTrade({ time: bar.time + 20_000, price: bar.high + 1, size: 3 });
    result.onTrade({ time: bar.time + 30_000, price: bar.low - 1, size: 2 });
    result.onTrade({ time: bar.time + 40_000, price: bar.close + 0.5, size: 1 });
    // An answer may fold trades into a frame's worth: read after one.
    await wait(50);
    const now = last(chart);
    assert.equal(chart.getData().length, COUNT);
    assert.equal(now.open, before.open);
    assert.equal(now.high, bar.high + 1);
    assert.equal(now.low, bar.low - 1);
    assert.equal(now.close, bar.close + 0.5);
    assert.equal(now.volume, bar.volume + 6);
  }],
  ['a trade in a new minute starts a candle at that minute', async ({ result, chart, fixtures, wait }) => {
    watchSetData(chart);
    const bar = history(fixtures)[COUNT - 1];
    // Two minutes on, part way in: the candle opens at the minute's start.
    const time = bar.time + 2 * fixtures.MINUTE + 15_000;
    result.onTrade({ time, price: 101.25, size: 4 });
    await wait(50);
    const now = last(chart);
    assert.equal(chart.getData().length, COUNT + 1);
    assert.equal(now.time < 1e12 ? now.time * 1000 : now.time, bar.time + 2 * fixtures.MINUTE);
    assert.deepEqual([now.open, now.high, now.low, now.close, now.volume], [101.25, 101.25, 101.25, 101.25, 4]);
  }],
  ['trades never reload the whole series', async ({ result, chart, wait }) => {
    watchSetData(chart);
    const bar = last(chart);
    for (let i = 0; i < 5; i++) result.onTrade({ time: (bar.time < 1e12 ? bar.time * 1000 : bar.time) + 1000 * i, price: 101 + i / 10, size: 1 });
    await wait(50);
    assert.equal(chart.__setDataCalls, 0, `setData was called ${chart.__setDataCalls} times for trades`);
  }],
];
