import assert from 'node:assert/strict';

export function args({ fixtures }) {
  return [fixtures.bars({ count: 300, step: fixtures.MINUTE, seed: 29 })];
}

export const checks = [
  ['no drawing-tools sidebar', ({ result, host, env }) => {
    assert.equal(result.isFeatureOn('sidebar'), false);
    const shown = [...host.querySelectorAll('.tcw-sidebar')].filter((el) => !el.hidden && env.window.getComputedStyle(el).display !== 'none');
    assert.equal(shown.length, 0, 'a sidebar shows');
  }],
  ['no replay or compare button', ({ result }) => {
    // The button's switch or its whole capability: either takes the button away.
    const off = (capability) => !result.isFeatureOn(capability) || !result.isFeatureOn(`toolbar.${capability}`);
    assert.ok(off('replay'), 'replay is on');
    assert.ok(off('compare'), 'compare is on');
  }],
  ['only 1m, 5m, 15m and 1h to pick', ({ host }) => {
    const offered = [...new Set([...host.querySelectorAll('[data-tf]')].map((el) => el.dataset.tf))].sort();
    assert.deepEqual(offered, ['15m', '1h', '1m', '5m']);
  }],
  ['the rest stays: indicators, settings, the status bar', ({ result }) => {
    for (const part of ['toolbar.indicators', 'settings', 'statusBar']) assert.equal(result.isFeatureOn(part), true, `${part} is off`);
  }],
  ['the bars are on its chart', ({ chart }) => assert.equal(chart.getData().length, 300)],
];
