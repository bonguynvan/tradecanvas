import assert from 'node:assert/strict';

const bars = (fixtures) => fixtures.bars({ count: 60, seed: 9 });
const messages = [];

export function args({ fixtures }) {
  const data = bars(fixtures);
  const last = data[data.length - 1].close;
  return [data, Math.round(last * 1.05 * 100) / 100, Math.round(last * 0.95 * 100) / 100, (m) => messages.push(String(m))];
}

async function price(result, value, wait) {
  result.onPrice(value);
  await wait(30);
}

export const checks = [
  ['two alerts on the chart, at the two levels', ({ chart, args }) => {
    const prices = chart.getAlerts().map((a) => a.price).sort((a, b) => a - b);
    assert.deepEqual(prices, [args[2], args[1]]);
  }],
  ['a price moves the last bar’s close', async ({ result, chart, args, wait }) => {
    const target = (args[1] + args[2]) / 2 + 0.25;
    await price(result, target, wait);
    const data = chart.getData();
    assert.equal(data[data.length - 1].close, target);
  }],
  ['crossing up through the upper level notifies', async ({ result, args, wait }) => {
    await price(result, args[1] - 0.5, wait);
    const before = messages.length;
    await price(result, args[1] + 0.5, wait);
    assert.equal(messages.length, before + 1, `${messages.length - before} notifications`);
  }],
  ['crossing down through the lower level notifies', async ({ result, args, wait }) => {
    await price(result, args[2] + 0.5, wait);
    const before = messages.length;
    await price(result, args[2] - 0.5, wait);
    assert.equal(messages.length, before + 1, `${messages.length - before} notifications`);
  }],
  ['moving between the levels says nothing', async ({ result, args, wait }) => {
    const before = messages.length;
    await price(result, (args[1] + args[2]) / 2, wait);
    await price(result, (args[1] + args[2]) / 2 + 0.1, wait);
    assert.equal(messages.length, before);
  }],
];
