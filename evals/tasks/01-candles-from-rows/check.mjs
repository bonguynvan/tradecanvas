import assert from 'node:assert/strict';

const COUNT = 120;
const expected = (fixtures) => fixtures.bars({ count: COUNT });

/** Rows as the API sends them: seconds, newest first. */
export function args({ fixtures }) {
  return [expected(fixtures).map((b) => [b.time / 1000, b.open, b.high, b.low, b.close, b.volume]).reverse()];
}

const asMs = (time) => (time < 1e12 ? time * 1000 : time);

export const checks = [
  ['every row is a bar on the chart', ({ chart }) => assert.equal(chart.getData().length, COUNT)],
  ['the bars run oldest to newest', ({ chart }) => {
    const times = chart.getData().map((b) => b.time);
    assert.ok(times.every((t, i) => i === 0 || t > times[i - 1]), 'bar times are not ascending');
  }],
  ['each bar keeps its prices and volume', ({ chart, fixtures }) => {
    const prices = (b) => [b.open, b.high, b.low, b.close, b.volume];
    assert.deepEqual(chart.getData().map(prices), expected(fixtures).map(prices));
  }],
  ['the dates are the rows’ dates, not 1970', ({ chart, fixtures }) => {
    assert.deepEqual(chart.getData().map((b) => asMs(b.time)), expected(fixtures).map((b) => b.time));
  }],
  ['it is a candlestick chart', ({ chart }) => assert.equal(JSON.parse(chart.saveState()).chartType, 'candlestick')],
];
