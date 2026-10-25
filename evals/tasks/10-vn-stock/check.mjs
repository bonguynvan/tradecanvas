import assert from 'node:assert/strict';

const REFERENCE = 25.35;

export function args({ fixtures }) {
  return [fixtures.bars({ count: 80, base: 25, decimals: 2, volatility: 0.015, seed: 13 }), REFERENCE];
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

export const checks = [
  ['HOSE’s price steps: 10, 50 and 100 dong by price band', ({ chart }) => {
    const steps = [chart.getPriceStep(9.5), chart.getPriceStep(25), chart.getPriceStep(60)];
    assert.ok(near(steps[0], 0.01) && near(steps[1], 0.05) && near(steps[2], 0.1), `steps ${steps.join(', ')}`);
  }],
  ['the day’s ceiling and floor, 7% from the reference on the steps', ({ chart }) => {
    const limits = chart.getPriceLimits();
    assert.ok(limits, 'no price limits');
    assert.ok(near(limits.ceiling, 27.1) && near(limits.floor, 23.6), `ceiling ${limits.ceiling}, floor ${limits.floor}`);
  }],
  ['Vietnam’s time on the axis', ({ chart }) => {
    const zone = chart.getEffectiveTimeZone();
    assert.ok(['Asia/Ho_Chi_Minh', 'Asia/Saigon', 'Asia/Bangkok'].includes(zone), `zone ${zone}`);
  }],
  ['numbers the Vietnamese way', ({ chart }) => assert.equal(chart.formatPrice(1234.5), '1.234,50')],
];
