import type { DataSeries, IndicatorPlugin, PriceSource } from '@tradecanvas/commons';
import { BUILT_IN_FACTORIES } from '../builtInFactories.js';
import { priceSourceBars } from '../sources.js';
import { columnsToBars, outputColumnBuffers, outputToColumns } from './columns.js';
import type { BarColumns } from './columns.js';
import type { IndicatorWorkerJob, IndicatorWorkerRequest, IndicatorWorkerResponse } from './messages.js';
import { isWorkerStateful, packWorkerState } from './workerState.js';

/** How the worker answers: a response, and the buffers it hands over with it. */
export type WorkerPost = (message: IndicatorWorkerResponse, transfer: ArrayBuffer[]) => void;

/** How the worker runs its next queued request later, so cancels sent meanwhile are read first. */
export type WorkerSchedule = (run: () => void) => void;

/** The bars one request carried, made into bar objects once for all its jobs. */
class Batch {
  private bars: DataSeries | null = null;
  private bySource = new Map<PriceSource, DataSeries>();

  constructor(readonly columns: BarColumns) {}

  /** The bars, with `source` in the close when given. */
  barsFor(source: PriceSource | undefined): DataSeries {
    this.bars ??= columnsToBars(this.columns);
    if (!source || source === 'close') return this.bars;
    let bars = this.bySource.get(source);
    if (!bars) this.bySource.set(source, (bars = priceSourceBars(this.bars, source)));
    return bars;
  }
}

interface Queued {
  job: IndicatorWorkerJob;
  batch: Batch;
}

/** Each built-in indicator by id: what the worker computes. */
export function workerPlugins(): Map<string, IndicatorPlugin> {
  const plugins = new Map<string, IndicatorPlugin>();
  for (const make of BUILT_IN_FACTORIES) {
    const plugin = make();
    plugins.set(plugin.descriptor.id, plugin);
  }
  return plugins;
}

const nextTask: WorkerSchedule = (run) => setTimeout(run, 0);

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown worker error';
}

/** Compute one job: the output as columns, or what went wrong. */
function calculate(plugins: Map<string, IndicatorPlugin>, { job, batch }: Queued, post: WorkerPost): void {
  const { requestId, indicatorId } = job;
  const plugin = plugins.get(indicatorId);
  if (!plugin) {
    post({ type: 'error', requestId, message: `Unknown indicator: ${indicatorId}` }, []);
    return;
  }
  try {
    const computed = plugin.calculate(batch.barsFor(job.source), job.config);
    const transfer: ArrayBuffer[] = [];
    const state = isWorkerStateful(plugin) ? packWorkerState(plugin.workerState(computed), transfer) : undefined;
    const output = { ...outputToColumns(computed, batch.columns.time), ...(state === undefined ? {} : { state }) };
    post({ type: 'result', requestId, output }, [...outputColumnBuffers(output), ...transfer]);
  } catch (err) {
    post({ type: 'error', requestId, message: errorMessage(err) }, []);
  }
}

/**
 * The indicator worker's message handler, apart from the worker so a test
 * can run it in its own thread. Jobs wait in a queue and run one a task, so
 * a `cancel` that comes while one runs is read before the next starts, and a
 * cancelled job is skipped.
 */
export function createIndicatorWorkerHandler(
  post: WorkerPost,
  schedule: WorkerSchedule = nextTask,
): (req: IndicatorWorkerRequest) => void {
  const plugins = workerPlugins();
  const queue: Queued[] = [];
  let scheduled = false;

  const runNext = (): void => {
    scheduled = false;
    const next = queue.shift();
    if (next) calculate(plugins, next, post);
    if (queue.length > 0) wake();
  };
  const wake = (): void => {
    if (scheduled) return;
    scheduled = true;
    schedule(runNext);
  };
  const cancel = (ids: readonly number[]): void => {
    const drop = new Set(ids);
    for (let i = queue.length - 1; i >= 0; i--) if (drop.has(queue[i].job.requestId)) queue.splice(i, 1);
  };

  return (req) => {
    if (req.type === 'ping') post({ type: 'pong', requestId: req.requestId }, []);
    else if (req.type === 'cancel') cancel(req.requestIds);
    else if (req.type === 'calculate') {
      const batch = new Batch(req.bars);
      for (const job of req.jobs) queue.push({ job, batch });
      wake();
    }
  };
}
