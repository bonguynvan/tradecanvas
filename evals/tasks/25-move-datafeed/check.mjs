import assert from 'node:assert/strict';

const COUNT = 2000;
let hours = [];
const asked = [];

/** The backend: ACME's hourly bars, for resolution '60' only, the latest `countback` before `to` (seconds). */
export function setup({ env, fixtures }) {
  hours = fixtures.bars({ count: COUNT, step: fixtures.HOUR, seed: 25 });
  env.serve((url) => {
    const u = new URL(url, 'https://api.example.com');
    if (!u.pathname.endsWith('/bars')) return null;
    asked.push(u);
    if (u.searchParams.get('symbol') !== 'ACME') return { status: 'unknown_symbol' };
    if (u.searchParams.get('resolution') !== '60') return { status: 'unsupported_resolution' };
    const to = Number(u.searchParams.get('to')) * 1000;
    const count = Number(u.searchParams.get('countback')) || 300;
    const rows = hours
      .filter((b) => b.time < to)
      .slice(-count)
      .map((b) => ({ t: b.time / 1000, o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume }));
    return { status: 'ok', rows };
  });
}

const FOUR_HOURS = 4 * 3_600_000;
const allApart = (data, ms) => data.length > 2 && data.slice(1).every((b, i) => b.time - data[i].time >= ms);

export const checks = [
  ['it is the trading widget', ({ result }) => assert.equal(typeof result?.getChart, 'function', 'mount resolved with no widget')],
  ['it reads ACME by the hour through the datafeed', () => {
    assert.ok(asked.length > 0, 'the datafeed was never asked for bars');
    assert.equal(asked[0].searchParams.get('symbol'), 'ACME');
    assert.equal(asked[0].searchParams.get('resolution'), '60');
  }],
  ['the history is on the chart', ({ chart }) => {
    const data = chart.getData();
    assert.ok(data.length >= 100, `${data.length} bars on the chart`);
    assert.deepEqual(data.slice(-20).map((b) => b.close), hours.slice(-20).map((b) => b.close));
  }],
  ['the 4-hour interval is built from hours, not asked of the backend', async ({ result, chart, wait }) => {
    const before = asked.length;
    await result.setTimeframe('4h');
    for (let waited = 0; waited < 8_000 && !allApart(chart.getData(), FOUR_HOURS); waited += 100) await wait(100);
    const later = asked.slice(before).map((u) => u.searchParams.get('resolution'));
    assert.ok(later.every((r) => r === '60'), `asked the backend for ${later.join(', ')}`);
    assert.ok(allApart(chart.getData(), FOUR_HOURS), 'no 4-hour bars on the chart');
  }],
  ['nothing but the backend is called', ({ env }) => {
    assert.deepEqual(env.network.sockets, []);
    assert.ok(env.network.fetches.every((u) => u.includes('/bars')), `other requests: ${env.network.fetches.filter((u) => !u.includes('/bars')).join(', ')}`);
  }],
];
