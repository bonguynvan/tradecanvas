import assert from 'node:assert/strict';

const sent = [];
let n = 0;

export function args({ fixtures }) {
  return [fixtures.bars({ count: 80, seed: 43 }), async (order) => {
    sent.push(order);
    return `B-${++n}`;
  }];
}

const pick = (o) => [o.side, o.type, o.price, o.quantity];

export const checks = [
  ['an order placed goes to submit', async ({ chart, wait }) => {
    // What a press on the ticket's Buy, or on a ladder cell, does: the chart asks for the order.
    chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95.5, quantity: 2 });
    await wait(30);
    assert.deepEqual(pick(sent.at(-1) ?? {}), ['buy', 'limit', 95.5, 2]);
  }],
  ['it shows as a working order under the broker’s id', ({ chart }) => {
    const order = chart.getOrders().find((o) => o.id === 'B-1');
    assert.ok(order, `orders: ${JSON.stringify(chart.getOrders().map((o) => o.id))}`);
    assert.deepEqual(pick(order), ['buy', 'limit', 95.5, 2]);
  }],
  ['a second order joins the first', async ({ chart, wait }) => {
    chart.placeOrderIntent({ side: 'sell', type: 'stop', price: 90, quantity: 1 });
    await wait(30);
    assert.deepEqual(chart.getOrders().map((o) => o.id).sort(), ['B-1', 'B-2']);
  }],
];
