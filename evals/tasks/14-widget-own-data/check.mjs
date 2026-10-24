import assert from 'node:assert/strict';

const COUNT = 200;

export function args({ fixtures }) {
  return [fixtures.bars({ count: COUNT, step: fixtures.HOUR, seed: 23 })];
}

export const checks = [
  ['it is the trading widget', ({ result }) => assert.equal(typeof result?.getChart, 'function', 'mount returned no widget')],
  ['ACME on 1h', ({ result }) => {
    assert.equal(result.getSymbol(), 'ACME');
    assert.equal(result.getTimeframe(), '1h');
  }],
  ['the bars given are on its chart', ({ chart }) => assert.equal(chart.getData().length, COUNT)],
  ['no exchange is called', ({ env }) => {
    assert.deepEqual(env.network.sockets, [], 'sockets opened');
    assert.deepEqual(env.network.fetches, [], 'requests made');
  }],
  ['its interface is in Vietnamese', ({ host }) => assert.ok(host.textContent.includes('Chỉ báo'), 'no Vietnamese "Indicators" on the toolbar')],
  ['dark', ({ chart, fixtures }) => assert.ok(fixtures.lightness(chart.getStyleValue('background.color')) < 0.5, `ground ${chart.getStyleValue('background.color')}`)],
];
