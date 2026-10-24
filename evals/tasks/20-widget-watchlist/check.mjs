import assert from 'node:assert/strict';

const SEEDS = { BTCUSDT: 61, ETHUSDT: 67, SOLUSDT: 71 };
const barsOf = (fixtures, symbol) => fixtures.bars({ count: 90, step: fixtures.HOUR, seed: SEEDS[symbol] ?? 1, base: symbol === 'BTCUSDT' ? 60000 : 3000 });

export function args({ fixtures }) {
  return [(symbol) => barsOf(fixtures, symbol)];
}

const closes = (chart) => chart.getData().map((b) => b.close);

export const checks = [
  ['a watchlist of the three symbols', ({ result }) => {
    const symbols = result.getWatchlists().flatMap((list) => list.symbols.map((s) => (typeof s === 'string' ? s : s.symbol)));
    for (const s of Object.keys(SEEDS)) assert.ok(symbols.includes(s), `${s} is not in the watchlist`);
  }],
  ['open beside the chart', ({ result }) => assert.equal(result.getOpenPanel(), 'watchlist')],
  ['it starts on BTCUSDT with its bars', ({ result, chart, fixtures }) => {
    assert.equal(result.getSymbol(), 'BTCUSDT');
    assert.deepEqual(closes(chart), barsOf(fixtures, 'BTCUSDT').map((b) => b.close));
  }],
  ['picking ETHUSDT shows its bars', async ({ result, host, fixtures, wait }) => {
    // A row shows the pair as ETH/USDT; its symbol is in data-symbol.
    const row = document.querySelector('.tcw-watchlist-row[data-symbol="ETHUSDT"]');
    assert.ok(row, 'no ETHUSDT row in the watchlist');
    row.click();
    await wait(100);
    assert.equal(result.getSymbol(), 'ETHUSDT');
    assert.deepEqual(closes(result.getChart()), barsOf(fixtures, 'ETHUSDT').map((b) => b.close));
  }],
  ['no exchange is called', ({ env }) => {
    assert.deepEqual(env.network.sockets, []);
    assert.deepEqual(env.network.fetches, []);
  }],
];
