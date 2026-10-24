import assert from 'node:assert/strict';

const COUNT = 150;
let startTime = 0;

export function args({ fixtures }) {
  const data = fixtures.bars({ count: COUNT, seed: 41 });
  startTime = data[60].time;
  return [data];
}

const asMs = (time) => (time < 1e12 ? time * 1000 : time);
const lastShown = (chart) => {
  const data = chart.getData();
  return asMs(data[data.length - 1].time);
};

export const checks = [
  ['a replay is running', ({ chart }) => {
    assert.equal(chart.isReplayActive(), true);
    assert.equal(chart.getReplayState(), 'playing');
  }],
  ['it starts at bars[60], the later bars hidden', ({ chart }) => {
    // "From bars[60]" reads two ways: bars[60] shown at the start, or revealed
    // by the first step; and a step or two may have run. 60 to 64 bars shown.
    const count = chart.getData().length;
    assert.ok(count >= 60 && count <= 64, `the chart shows ${count} bars, up to ${new Date(lastShown(chart)).toISOString()}`);
    assert.ok(lastShown(chart) >= startTime - 86_400_000, 'the replay starts before bars[60]');
  }],
  ['it plays forward, about four bars a second', async ({ chart, wait }) => {
    const before = chart.getData().length;
    await wait(2000);
    const moved = chart.getData().length - before;
    assert.ok(moved >= 5 && moved <= 12, `${moved} bars in 2 s`);
  }],
];
