import assert from 'node:assert/strict';

function trades(fixtures) {
  const data = fixtures.bars({ count: 120, seed: 31 });
  return [[10, 18, 'long'], [30, 41, 'short'], [55, 60, 'long'], [80, 97, 'short']].map(([a, b, side], i) => ({
    id: `t${i + 1}`, side, entryTime: data[a].time, entryPrice: data[a].close, exitTime: data[b].time, exitPrice: data[b].close,
  }));
}

export function args({ fixtures }) {
  return [fixtures.bars({ count: 120, seed: 31 }), trades(fixtures)];
}

const asMs = (time) => (time < 1e12 ? time * 1000 : time);

export const checks = [
  ['a signal at each entry, long or short', ({ chart, fixtures }) => {
    const want = trades(fixtures).map((t) => [t.entryTime, t.entryPrice, t.side]).sort((a, b) => a[0] - b[0]);
    const got = chart.getSignalMarkers().map((m) => [asMs(m.time), m.price, m.direction]).sort((a, b) => a[0] - b[0]);
    assert.deepEqual(got, want);
  }],
  ['a zone for each trade, entry to exit', ({ chart, fixtures }) => {
    const want = trades(fixtures).map((t) => [t.entryTime, t.entryPrice, t.exitTime, t.exitPrice, t.side]).sort((a, b) => a[0] - b[0]);
    const got = chart.getTradeZones().map((z) => [asMs(z.entryTime), z.entryPrice, asMs(z.exitTime), z.exitPrice, z.direction]).sort((a, b) => a[0] - b[0]);
    assert.deepEqual(got, want);
  }],
  ['no drawings stand in for them', ({ chart }) => assert.equal(chart.getDrawings().length, 0)],
];
