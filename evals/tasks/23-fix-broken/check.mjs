import assert from 'node:assert/strict';

const COUNT = 120;
const days = (fixtures) => fixtures.bars({ count: COUNT, seed: 83 });

/** The API's rows: a date string per day, newest first. */
export function args({ fixtures }) {
  return [days(fixtures).map((b) => ({ date: new Date(b.time).toISOString().slice(0, 10), o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume })).reverse()];
}

const asMs = (time) => (time < 1e12 ? time * 1000 : time);

export const checks = [
  ['every day on the chart, oldest first', ({ chart, fixtures }) => {
    assert.deepEqual(chart.getData().map((b) => asMs(b.time)), days(fixtures).map((b) => b.time));
  }],
  ['each day keeps its prices', ({ chart, fixtures }) => {
    assert.deepEqual(chart.getData().map((b) => b.close), days(fixtures).map((b) => b.close));
  }],
  ['Bollinger Bands of 20 and 2, on the price', ({ chart }) => {
    const bb = chart.getActiveIndicators().find((i) => i.id === 'bb');
    assert.ok(bb, `no Bollinger Bands: ${chart.getActiveIndicators().map((i) => i.id).join(', ') || 'no indicators'}`);
    assert.deepEqual([Number(bb.params.period), Number(bb.params.stdDev)], [20, 2]);
    assert.equal(chart.getIndicatorPanes().some((p) => p.instanceIds.includes(bb.instanceId)), false, 'the bands are in a pane of their own');
  }],
  ['mount still returns the chart', ({ result }) => assert.equal(typeof result?.getData, 'function')],
];
