import assert from 'node:assert/strict';

const COUNT = 80;
const bars = (fixtures) => fixtures.bars({ count: COUNT, seed: 5 });

export function args({ fixtures }) {
  return [bars(fixtures)];
}

/** The answer's indicator: the one on the chart that isn't built in. */
function custom(chart) {
  const builtIn = new Set(['rsi', 'ema', 'sma', 'macd', 'bb', 'atr', 'vwap']);
  return chart.getActiveIndicators().find((i) => !builtIn.has(i.id));
}

/** The first number in a value point, whatever the answer named its line. */
const valueOf = (point) => (point && typeof point === 'object' ? Object.values(point).find((v) => typeof v === 'number') : undefined);

export const checks = [
  ['an indicator of the answer’s own is on the chart', ({ chart }) => assert.ok(custom(chart), 'no indicator besides built-in ones')],
  ['it is (high − low) / close × 100 at every bar', ({ chart, fixtures }) => {
    const series = chart.getIndicatorOutput(custom(chart).instanceId)?.series ?? [];
    const expected = bars(fixtures).map((b) => ((b.high - b.low) / b.close) * 100);
    assert.equal(series.length, COUNT);
    for (let i = 0; i < COUNT; i++) {
      const got = valueOf(series[i]);
      assert.ok(typeof got === 'number' && Math.abs(got - expected[i]) < 1e-6, `bar ${i}: ${got} ≠ ${expected[i]}`);
    }
  }],
  ['it has a pane of its own', ({ chart }) => {
    const id = custom(chart).instanceId;
    const pane = chart.getIndicatorPanes().find((p) => p.instanceIds.includes(id));
    assert.ok(pane, 'it is drawn on the price');
    assert.deepEqual(pane.instanceIds, [id]);
  }],
  ['the chart knows it by name, to add again', ({ chart }) => {
    const { id } = custom(chart);
    assert.ok(chart.getAvailableIndicators().some((d) => (d.id ?? d.descriptor?.id) === id), `${id} is not among the chart's indicators`);
    const again = chart.addIndicator(id);
    assert.ok(again, `addIndicator('${id}') gave nothing`);
  }],
];
