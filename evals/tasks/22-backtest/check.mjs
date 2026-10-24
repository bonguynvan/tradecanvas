import assert from 'node:assert/strict';

const bars = (fixtures) => fixtures.bars({ count: 400, seed: 79, volatility: 0.025 });

export function args({ fixtures }) {
  return [bars(fixtures)];
}

const sma = (closes, end, period) => closes.slice(end - period + 1, end + 1).reduce((a, b) => a + b, 0) / period;

/** The rule as stated, worked out here: entries and exits at the next bar's open, closed trades only. */
function expected(data) {
  const closes = data.map((b) => b.close);
  const trades = [];
  let entry = null;
  for (let i = 30; i < data.length - 1; i++) {
    const up = sma(closes, i - 1, 10) <= sma(closes, i - 1, 30) && sma(closes, i, 10) > sma(closes, i, 30);
    const down = sma(closes, i - 1, 10) >= sma(closes, i - 1, 30) && sma(closes, i, 10) < sma(closes, i, 30);
    if (up && !entry) entry = data[i + 1];
    else if (down && entry) {
      trades.push({ entry, exit: data[i + 1] });
      entry = null;
    }
  }
  const profit = trades.reduce((sum, t) => sum + (t.exit.open - t.entry.open) * 10, 0);
  return { trades, returnPct: (profit / 10_000) * 100 };
}

const asMs = (time) => (time < 1e12 ? time * 1000 : time);

export const checks = [
  ['the number of closed trades', ({ result, fixtures }) => assert.equal(result.report.trades, expected(bars(fixtures)).trades.length)],
  ['their return, in percent of the $10,000', ({ result, fixtures }) => {
    const want = expected(bars(fixtures)).returnPct;
    assert.ok(Math.abs(result.report.returnPct - want) < 0.01, `got ${result.report.returnPct}, want ${want.toFixed(4)}`);
  }],
  ['each trade shaded from entry to exit', ({ chart, fixtures }) => {
    const want = expected(bars(fixtures)).trades.map((t) => [t.entry.time, t.exit.time]);
    const got = chart.getTradeZones().map((z) => [asMs(z.entryTime), asMs(z.exitTime)]).sort((a, b) => a[0] - b[0]);
    assert.deepEqual(got, want);
  }],
];
