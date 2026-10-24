import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const bars = (fixtures, count = 120) => fixtures.bars({ count, seed: 73 });

/** Render the answer's component with the project's own React, as the app would, and keep a handle on it. */
export async function mountWith({ answer, host, fixtures, ws }) {
  const require = createRequire(join(ws, 'package.json'));
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof answer.PriceChart !== 'function' && typeof answer.PriceChart !== 'object') throw new Error('src/main.tsx exports no PriceChart');
  // Count destroy() on the package the answer imports: the same module, so the same class.
  const { Chart } = await import(pathToFileURL(require.resolve('@tradecanvas/chart')).href.replace(/index\.cjs$/, 'index.js'));
  const state = { chart: null, root: createRoot(host), destroyed: 0 };
  const destroy = Chart.prototype.destroy;
  Chart.prototype.destroy = function counted(...a) {
    state.destroyed++;
    return destroy.apply(this, a);
  };
  state.render = (props) => React.act(async () => {
    state.root.render(React.createElement(answer.PriceChart, { ...props, onReady: (c) => { state.chart = c; } }));
  });
  state.unmount = () => React.act(async () => state.root.unmount());
  await state.render({ bars: bars(fixtures), showRsi: true });
  return state;
}

const rsiIn = (chart) => chart.getActiveIndicators().filter((i) => i.id === 'rsi');

export const checks = [
  ['onReady gives the chart, with the bars', ({ result }) => {
    assert.ok(result.chart, 'onReady was not called');
    assert.equal(result.chart.getData().length, 120);
  }],
  ['an RSI of 14 in a pane while showRsi is on', ({ result }) => {
    const [rsi] = rsiIn(result.chart);
    assert.ok(rsi && Number(rsi.params.period) === 14, 'no RSI(14)');
    assert.ok(result.chart.getIndicatorPanes().some((p) => p.instanceIds.includes(rsi.instanceId)), 'the RSI is on the price');
  }],
  ['no live feed of its own', ({ env }) => {
    assert.deepEqual(env.network.sockets, [], 'it opened a socket');
    assert.deepEqual(env.network.fetches, [], 'it made requests');
  }],
  ['new bars show', async ({ result, fixtures, wait }) => {
    await result.render({ bars: bars(fixtures, 150), showRsi: true });
    await wait(20);
    assert.equal(result.chart.getData().length, 150);
  }],
  ['showRsi off takes the RSI away', async ({ result, fixtures, wait }) => {
    await result.render({ bars: bars(fixtures, 150), showRsi: false });
    await wait(20);
    assert.equal(rsiIn(result.chart).length, 0);
  }],
  ['unmounting frees the chart', async ({ result }) => {
    const before = result.destroyed;
    await result.unmount();
    assert.ok(result.destroyed > before, 'the chart was never destroyed: its listeners and timers live on');
  }],
];
