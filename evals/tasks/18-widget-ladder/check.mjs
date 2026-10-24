import assert from 'node:assert/strict';

export function args({ fixtures }) {
  return [fixtures.bars({ count: 80, seed: 47 }), fixtures.book({ mid: 100, tick: 0.5, levels: 8 })];
}

/** The prices the ladder shows, as numbers. */
const shownPrices = (host) => [...document.querySelectorAll('.tcw-ladder-figure')].map((el) => Number(el.textContent.replace(/[^\d.-]/g, '')));

export const checks = [
  ['the ladder is open beside the chart', ({ result }) => {
    const widget = result.widget ?? result;
    assert.equal(widget.getOpenPanel(), 'depthLadder');
  }],
  ['it shows the book’s sixteen levels', ({ host }) => {
    const prices = shownPrices(host).sort((a, b) => a - b);
    assert.deepEqual(prices, [96, 96.5, 97, 97.5, 98, 98.5, 99, 99.5, 100.5, 101, 101.5, 102, 102.5, 103, 103.5, 104]);
  }],
  ['onBook moves it to the new book', async ({ result, host, fixtures, wait }) => {
    result.onBook(fixtures.book({ mid: 110, tick: 0.5, levels: 8, seed: 5 }));
    await wait(30);
    const prices = shownPrices(host);
    assert.ok(prices.includes(110.5) && prices.includes(109.5) && !prices.includes(100.5), `prices ${prices.join(', ')}`);
  }],
];
