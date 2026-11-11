import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorPlugin } from '@tradecanvas/commons';
import type { InputSource } from '../sources.js';
import { barsToColumns } from './columns.js';
import type { BarColumns } from './columns.js';
import type { IndicatorWorkerClient, WorkerJobDone, WorkerResult } from './IndicatorWorkerPool.js';
import { isWorkerStateful } from './workerState.js';

/**
 * Below this many bars a full recompute stays on the main thread. Taking an
 * output back from the worker (its points made again here) costs the main
 * thread about what computing it does, so the worker saves no work: it
 * splits it into slices a frame can afford. In Chrome on a desktop, BB, EMA,
 * RSI and MACD take 4 ms at 20,000 bars and 14 ms at 100,000 (`pnpm bench`,
 * `recompute.bench.ts`): under 50,000 bars a typical stack fits in a frame
 * as it is, and the round trip would only make the lines come later.
 */
export const INDICATOR_WORKER_MIN_BARS = 50_000;

/** A full recompute of one indicator running in the worker. */
export interface WorkerComputation {
  requestId: number;
  /** The bars now: the series it was asked on, as ticks since have left it. */
  data: DataSeries;
  /** The bars' times when it was asked: what ticks since may only have changed at the end. */
  times: Float64Array;
  /**
   * The earliest bar a tick since changed, from which the reply is brought
   * up to date with the plugin's `update`. Infinity: none did.
   */
  from: number;
}

/**
 * The bars as the worker is sent them, made once for every indicator sent
 * in the same task: they go to it in one message.
 */
export interface WorkerBars {
  data: DataSeries;
  columns: BarColumns;
  /** The times, kept here: the columns' buffers go to the worker. */
  times: Float64Array;
}

export function workerBars(data: DataSeries): WorkerBars {
  const columns = barsToColumns(data);
  return { data, columns, times: columns.time.slice() };
}

/**
 * Send a full recompute of `plugin` over the bars to the worker, with the
 * price source it reads; null when the worker cannot take it.
 */
export function startWorkerComputation(
  client: IndicatorWorkerClient,
  plugin: IndicatorPlugin,
  config: IndicatorConfig,
  bars: WorkerBars,
  source: InputSource,
  done: (requestId: number, result: WorkerResult | Error) => void,
): WorkerComputation | null {
  let requestId = 0;
  const reply: WorkerJobDone = (result) => done(requestId, result);
  const sent = client.submit({
    indicatorId: plugin.descriptor.id,
    config,
    ...(source.kind === 'price' ? { source: source.source } : {}),
    bars: bars.columns,
    times: bars.times,
  }, reply);
  if (sent === null) return null;
  requestId = sent;
  return { requestId, data: bars.data, times: bars.times, from: Infinity };
}

/**
 * Whether the bars changed only from `from` on since the computation was
 * asked for (a live tick, a new bar): its reply can then be brought up to
 * date. Otherwise the series was replaced, and the reply is of no use.
 */
export function changedOnlyAtTail(job: WorkerComputation): boolean {
  const { data, times } = job;
  const kept = Math.min(job.from, times.length);
  if (kept === 0 || data.length < kept) return false;
  return data[0].time === times[0] && data[kept - 1].time === times[kept - 1];
}

/**
 * The reply over the bars now: as it is when no tick came, else updated
 * from the earliest bar a tick changed. Null when it cannot be (the series
 * was replaced, or a tick changed the first bar): compute it again.
 */
export function bringUpToDate(
  job: WorkerComputation,
  result: WorkerResult,
  plugin: IndicatorPlugin,
  config: IndicatorConfig,
  bars: () => DataSeries,
): IndicatorOutput | null {
  if (!changedOnlyAtTail(job)) return null;
  const reply = result.output;
  // What `update` reads beside the output, as `calculate` would have kept it here.
  if (isWorkerStateful(plugin)) plugin.adoptWorkerState(reply, result.state, job.times);
  const from = Math.min(job.from, job.times.length);
  if (from === job.times.length && job.data.length === from) return reply;
  return plugin.update?.(bars(), config, reply, from) ?? null;
}
