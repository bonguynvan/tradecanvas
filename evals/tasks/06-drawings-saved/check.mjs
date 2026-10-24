import assert from 'node:assert/strict';

const KEY = 'my-layout';
const bars = (fixtures) => fixtures.bars({ count: 90, seed: 21 });

export function setup({ env }) {
  env.window.localStorage.clear();
}

export function args({ fixtures }) {
  return [bars(fixtures)];
}

const asMs = (time) => (time < 1e12 ? time * 1000 : time);
const near = (a, b) => Math.abs(a - b) < 1e-6;

/** Wait until `test` holds, or `ms` pass: an answer may save after a delay. */
async function until(test, ms, wait) {
  for (let waited = 0; waited < ms; waited += 100) {
    if (test()) return true;
    await wait(100);
  }
  return test();
}

export const checks = [
  ['a trend line from the lowest low to the highest high', ({ chart, fixtures }) => {
    const data = bars(fixtures);
    const low = data.reduce((a, b) => (b.low < a.low ? b : a));
    const high = data.reduce((a, b) => (b.high > a.high ? b : a));
    const line = chart.getDrawings().find((d) => d.type === 'trendLine');
    assert.ok(line, 'no trend line');
    const ends = line.anchors.map((a) => [asMs(a.time), a.price]).sort((a, b) => a[0] - b[0]);
    const want = [[low.time, low.low], [high.time, high.high]].sort((a, b) => a[0] - b[0]);
    assert.ok(ends.every(([t, p], i) => t === want[i][0] && near(p, want[i][1])), `ends ${JSON.stringify(ends)}, want ${JSON.stringify(want)}`);
  }],
  ['a horizontal line at the last close', ({ chart, fixtures }) => {
    const data = bars(fixtures);
    const line = chart.getDrawings().find((d) => d.type === 'horizontalLine');
    assert.ok(line, 'no horizontal line');
    assert.ok(near(line.anchors[0].price, data[data.length - 1].close), `at ${line.anchors[0].price}`);
  }],
  ['what the user adds and moves is saved, and comes back on reload', async ({ chart, answer, env, fixtures, wait }) => {
    const data = bars(fixtures);
    chart.addDrawing({ type: 'verticalLine', anchors: [{ time: data[40].time, price: data[40].close }] });
    const added = await until(() => (env.window.localStorage.getItem(KEY) ?? '').includes('verticalLine'), 8000, wait);
    assert.ok(added, `localStorage['${KEY}'] holds no layout with the user's drawing`);
    // The user drags the horizontal line to a round price.
    const line = chart.getDrawings().find((d) => d.type === 'horizontalLine');
    chart.updateDrawing(line.id, { anchors: [{ ...line.anchors[0], price: 123.45 }] });
    const moved = await until(() => (env.window.localStorage.getItem(KEY) ?? '').includes('123.45'), 8000, wait);
    assert.ok(moved, 'the moved line is not saved');
    chart.destroy?.();
    const mount = answer.mount ?? answer.default;
    const again = await mount(env.host(), data);
    const reloaded = (again.getChart?.() ?? again).getDrawings();
    assert.deepEqual(reloaded.map((d) => d.type).sort(), ['horizontalLine', 'trendLine', 'verticalLine']);
    assert.equal(reloaded.find((d) => d.type === 'horizontalLine').anchors[0].price, 123.45);
  }],
];
