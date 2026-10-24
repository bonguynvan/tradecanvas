import assert from 'node:assert/strict';

const AVAILABLE = 300;
let served = [];
const asked = [];

/** The endpoint: the latest `limit` candles of ACME 1h, numbers as strings. */
export function setup({ env, fixtures }) {
  served = fixtures.bars({ count: AVAILABLE, step: fixtures.HOUR, seed: 17 });
  env.serve((url) => {
    const u = new URL(url, 'https://api.example.com');
    if (!u.pathname.endsWith('/klines')) return null;
    asked.push(u);
    if (u.searchParams.get('symbol') !== 'ACME' || u.searchParams.get('interval') !== '1h') return [];
    const limit = Math.min(Number(u.searchParams.get('limit') ?? AVAILABLE) || AVAILABLE, AVAILABLE);
    return served.slice(-limit).map((b) => [b.time, String(b.open), String(b.high), String(b.low), String(b.close), String(b.volume)]);
  });
}

const firstLimit = () => Math.min(Number(asked[0]?.searchParams.get('limit') ?? AVAILABLE) || AVAILABLE, AVAILABLE);

export const checks = [
  ['it asks for ACME’s 1h candles', () => {
    assert.ok(asked.length > 0, 'the endpoint was never called');
    assert.equal(asked[0].searchParams.get('symbol'), 'ACME');
    assert.equal(asked[0].searchParams.get('interval'), '1h');
  }],
  ['the history is on the chart, as numbers', ({ chart }) => {
    const data = chart.getData();
    const want = served.slice(-firstLimit());
    assert.equal(data.length, want.length);
    assert.equal(typeof data[0].close, 'number', 'closes are strings');
    assert.deepEqual(data.map((b) => b.close), want.map((b) => b.close));
  }],
  ['the latest candle refreshes by itself', async ({ chart, wait }) => {
    const last = served[served.length - 1];
    served = [...served.slice(0, -1), { ...last, close: last.close + 3.21, high: last.high + 3.21 }];
    for (let waited = 0; waited < 12_000; waited += 250) {
      const data = chart.getData();
      if (data[data.length - 1].close === last.close + 3.21) return;
      await wait(250);
    }
    assert.fail('the last candle did not change within 12 s');
  }],
  ['no other feed is opened', ({ env }) => {
    assert.deepEqual(env.network.sockets, []);
    assert.ok(env.network.fetches.every((u) => u.includes('/klines')), `other requests: ${env.network.fetches.filter((u) => !u.includes('/klines')).join(', ')}`);
  }],
];
