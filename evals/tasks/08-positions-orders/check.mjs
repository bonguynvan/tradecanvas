import assert from 'node:assert/strict';

const saved = [];

export function args({ fixtures }) {
  return [fixtures.bars({ count: 60, seed: 4 }), (stopLoss, takeProfit) => saved.push([stopLoss, takeProfit])];
}

export const checks = [
  ['the long position with its stop and target', ({ chart }) => {
    const p = chart.getPositions().find((x) => x.id === 'p1');
    assert.ok(p, 'no position p1');
    assert.deepEqual([p.side, p.entryPrice, p.quantity, p.stopLoss, p.takeProfit], ['buy', 100, 2, 95, 110]);
  }],
  ['the sell limit order', ({ chart }) => {
    const o = chart.getOrders().find((x) => x.id === 'o1');
    assert.ok(o, 'no order o1');
    assert.deepEqual([o.side, o.type, o.price, o.quantity], ['sell', 'limit', 112, 1]);
  }],
  ['dragging the stop saves it, and the chart keeps it', async ({ chart, wait }) => {
    // What a drag of the stop's line does: the chart asks for the change.
    chart.modifyPositionIntent({ positionId: 'p1', stopLoss: 96.5, takeProfit: 110 });
    await wait(20);
    assert.deepEqual(saved.at(-1), [96.5, 110], `save got ${JSON.stringify(saved.at(-1))}`);
    assert.equal(chart.getPositions().find((x) => x.id === 'p1')?.stopLoss, 96.5);
  }],
  ['dragging the target saves it, the stop kept', async ({ chart, wait }) => {
    chart.modifyPositionIntent({ positionId: 'p1', takeProfit: 111.5 });
    await wait(20);
    assert.deepEqual(saved.at(-1), [96.5, 111.5], `save got ${JSON.stringify(saved.at(-1))}`);
    assert.equal(chart.getPositions().find((x) => x.id === 'p1')?.takeProfit, 111.5);
  }],
];
