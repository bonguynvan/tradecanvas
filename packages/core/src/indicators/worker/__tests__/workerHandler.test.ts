import { describe, it, expect } from 'vitest';
import type { IndicatorConfig, IndicatorOutput, IndicatorPlugin, PriceSource } from '@tradecanvas/commons';
import { createIndicatorWorkerHandler, workerPlugins } from '../workerHandler.js';
import type { IndicatorWorkerRequest, IndicatorWorkerResponse } from '../messages.js';
import { barsToColumns, columnsToOutput } from '../columns.js';
import { IndicatorEngine } from '../../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../../registry.js';
import { walkBars } from './workerFixtures.js';
import { priceSourceBars } from '../../sources.js';
import { MACDIndicator } from '../../panel/MACD.js';
import { isWorkerStateful, unpackWorkerState } from '../workerState.js';

// Long enough for a plugin's kept arrays to travel packed.
const BARS = walkBars(1500);
const TIMES = BARS.map((bar) => bar.time);

/** A handler that answers at once, with what it posted collected. */
function syncHandler(): { handle: (req: IndicatorWorkerRequest) => void; replies: IndicatorWorkerResponse[] } {
  const replies: IndicatorWorkerResponse[] = [];
  const handle = createIndicatorWorkerHandler((message) => replies.push(structuredClone(message)), (run) => run());
  return { handle, replies };
}

function configOf(plugin: IndicatorPlugin): IndicatorConfig {
  const id = plugin.descriptor.id;
  return { id, instanceId: `${id}-w`, params: { ...plugin.descriptor.defaultConfig } as IndicatorConfig['params'], exchangeTimeZone: 'America/New_York' };
}

function viaWorker(id: string, config: IndicatorConfig, source?: PriceSource): IndicatorOutput {
  const { handle, replies } = syncHandler();
  handle({ type: 'calculate', bars: barsToColumns(BARS), jobs: [{ requestId: 1, indicatorId: id, config, ...(source ? { source } : {}) }] });
  const reply = replies[0];
  if (reply?.type !== 'result') throw new Error(`no result for ${id}: ${JSON.stringify(reply)}`);
  return columnsToOutput(reply.output, TIMES);
}

describe('the indicator worker', () => {
  it('computes every built-in indicator the chart registers', () => {
    const engine = new IndicatorEngine();
    registerBuiltInIndicators(engine);
    const registered = engine.getAvailableIndicators().map((d) => d.id).sort();
    expect([...workerPlugins().keys()].sort()).toEqual(registered);
  });

  it.each([...workerPlugins().values()].map((p) => [p.descriptor.id, p] as const))(
    '%s: the worker gives what calculate gives',
    (id, plugin) => {
      const config = configOf(plugin);
      const expected = plugin.calculate(BARS, config);
      const got = viaWorker(id, config);
      expect(got.series).toEqual(expected.series);
      expect([...got.values]).toEqual([...expected.values]);
      expect(got.meta).toEqual(expected.meta);
    },
  );

  it.each([...workerPlugins().values()].filter((p) => p.update).map((p) => [p.descriptor.id, p] as const))(
    '%s: a tick after a recompute in the worker is still incremental',
    (id, plugin) => {
      const config = configOf(plugin);
      const { handle, replies } = syncHandler();
      handle({ type: 'calculate', bars: barsToColumns(BARS), jobs: [{ requestId: 1, indicatorId: id, config }] });
      const reply = replies[0];
      if (reply?.type !== 'result') throw new Error(`no result for ${id}`);
      const output = columnsToOutput(reply.output, TIMES);
      if (isWorkerStateful(plugin)) plugin.adoptWorkerState(output, unpackWorkerState(reply.output.state), TIMES);
      const ticked = BARS.slice();
      const last = ticked[ticked.length - 1];
      ticked[ticked.length - 1] = { ...last, close: last.close * 1.01, high: Math.max(last.high, last.close * 1.01), volume: last.volume + 5 };
      const updated = plugin.update!(ticked, config, output, ticked.length - 1);
      expect(updated).not.toBeNull();
      const want = plugin.calculate(ticked, config).series!;
      const got = updated!.series!;
      expect(got).toHaveLength(want.length);
      for (const i of [want.length - 2, want.length - 1]) {
        for (const key of Object.keys(want[i] ?? {})) expect(got[i]?.[key]).toBeCloseTo(want[i]![key]!, 6);
      }
    },
  );

  it('computes on a price source in place of the close', () => {
    const config: IndicatorConfig = { id: 'macd', instanceId: 'm', params: { source: 'hlc3' } };
    const expected = new MACDIndicator().calculate(priceSourceBars(BARS, 'hlc3'), config);
    expect(viaWorker('macd', config, 'hlc3').series).toEqual(expected.series);
  });

  it('answers each job of a request on its own', () => {
    const { handle, replies } = syncHandler();
    const config: IndicatorConfig = { id: 'sma', instanceId: 's', params: { period: 5 } };
    handle({ type: 'calculate', bars: barsToColumns(BARS), jobs: [
      { requestId: 7, indicatorId: 'sma', config },
      { requestId: 8, indicatorId: 'ema', config: { ...config, id: 'ema' } },
    ] });
    expect(replies.map((r) => [r.type, r.requestId])).toEqual([['result', 7], ['result', 8]]);
  });

  it('answers a ping', () => {
    const { handle, replies } = syncHandler();
    handle({ type: 'ping', requestId: 4 });
    expect(replies).toEqual([{ type: 'pong', requestId: 4 }]);
  });

  it('says so for an indicator it does not know', () => {
    const { handle, replies } = syncHandler();
    handle({ type: 'calculate', bars: barsToColumns(BARS), jobs: [{ requestId: 2, indicatorId: 'nope', config: { id: 'nope', instanceId: 'x', params: {} } }] });
    expect(replies[0]).toMatchObject({ type: 'error', requestId: 2 });
  });

  it('skips a queued request cancelled before it runs', () => {
    const replies: IndicatorWorkerResponse[] = [];
    const later: (() => void)[] = [];
    const handle = createIndicatorWorkerHandler((m) => replies.push(m), (run) => later.push(run));
    const config: IndicatorConfig = { id: 'sma', instanceId: 's', params: { period: 5 } };
    handle({ type: 'calculate', bars: barsToColumns(BARS), jobs: [{ requestId: 1, indicatorId: 'sma', config }, { requestId: 2, indicatorId: 'sma', config }] });
    handle({ type: 'cancel', requestIds: [1] });
    while (later.length) later.shift()!();
    expect(replies.map((r) => r.requestId)).toEqual([2]);
  });
});
