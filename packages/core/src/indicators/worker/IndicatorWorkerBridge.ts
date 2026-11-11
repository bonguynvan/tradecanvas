import type { DataSeries } from '@tradecanvas/commons';
import { BUILT_IN_PLUGINS } from '../builtIns.js';
import { inputSource, priceSourceBars } from '../sources.js';
import type { IndicatorInstance } from '../indicatorInstance.js';
import type { IndicatorWorkerClient, WorkerResult } from './IndicatorWorkerPool.js';
import { INDICATOR_WORKER_MIN_BARS, bringUpToDate, startWorkerComputation, workerBars } from './workerJobs.js';
import type { WorkerBars, WorkerComputation } from './workerJobs.js';

/** Where full recomputes go besides this thread (`useWorker`). */
export interface IndicatorWorkerOptions {
  /** The fewest bars a full recompute goes to the worker for. Default `INDICATOR_WORKER_MIN_BARS`. */
  minBars?: number;
  /**
   * Called when outputs from the worker have been put in place, or a read
   * finished here what was still out: draw again, and fit the scales.
   */
  onLand?: () => void;
}

/** What the bridge reads and runs of the engine's. */
export interface WorkerBridgeHost {
  instance(instanceId: string): IndicatorInstance | undefined;
  /** The instances, each after the indicators it reads. */
  ordered(): IndicatorInstance[];
  /** The instances reading `instanceId`'s lines, directly or through others. */
  dependents(instanceId: string): string[];
  /** Compute one instance; `here` keeps a full computation off the worker. */
  compute(instance: IndicatorInstance, data: DataSeries, from?: number, here?: boolean): void;
  /** Run the ticks waiting for the next read. */
  runPending(): void;
}

interface WorkerUse {
  client: IndicatorWorkerClient;
  minBars: number;
  onLand: (() => void) | null;
}

/**
 * The engine's way to the indicator worker: which full recomputes go there,
 * what runs there by instance, the ticks that come meanwhile, and the
 * replies put in place. While one runs, the instance keeps its last output;
 * `settle` computes here whatever is still out, for a read that must see
 * the bars' own values.
 */
export class IndicatorWorkerBridge {
  private worker: WorkerUse | null = null;
  /** The full recomputes running in the worker, by instance: each shows its last output till it lands. */
  private jobs = new Map<string, WorkerComputation>();
  /** The bars sent to the worker this task, shared by every indicator sent with them. */
  private sharedBars: WorkerBars | null = null;

  constructor(private readonly host: WorkerBridgeHost) {}

  /** Send full recomputes to `client`'s worker from now on (null: none), once what is out is settled. */
  use(client: IndicatorWorkerClient | null, options: IndicatorWorkerOptions): void {
    this.settle();
    this.worker = client ? { client, minBars: options.minBars ?? INDICATOR_WORKER_MIN_BARS, onLand: options.onLand ?? null } : null;
  }

  /**
   * Whether a full recompute runs in the worker: any, or (with an id) the
   * instance's own, or that of an indicator whose line it reads.
   */
  computing(instanceId?: string): boolean {
    if (instanceId === undefined) return this.jobs.size > 0;
    if (this.jobs.has(instanceId)) return true;
    const instance = this.host.instance(instanceId);
    return !!instance && this.jobReadBy(instance, this.jobs) !== null;
  }

  /** Drop what runs in the worker without computing it, and send nothing more there: the engine is going. */
  stop(): void {
    this.worker?.client.cancel([...this.jobs.values()].map((job) => job.requestId));
    this.jobs.clear();
    this.worker = null;
  }

  /** The bars changed: a recompute sent from now on is sent them anew. */
  barsChanged(): void {
    this.sharedBars = null;
  }

  /**
   * Whether the instance's computation is the worker's to do: a full one is
   * sent there; a tick while one runs only widens what its reply is brought
   * up to date from; and an indicator reading the line of one running there
   * is computed when that one lands.
   */
  takes(instance: IndicatorInstance, data: DataSeries, from?: number): boolean {
    if (!this.worker && this.jobs.size === 0) return false;
    const id = instance.config.instanceId;
    const job = this.jobs.get(id);
    if (job && from !== undefined) {
      job.from = Math.min(job.from, from);
      job.data = data;
      return true;
    }
    // A full computation replaces the one running.
    if (job) this.drop(id);
    if (this.jobReadBy(instance, this.jobs)) return true;
    return from === undefined && this.send(instance, data);
  }

  /** Cancel the instance's recompute in the worker, if one runs. */
  drop(instanceId: string): void {
    const job = this.jobs.get(instanceId);
    if (!job) return;
    this.jobs.delete(instanceId);
    this.worker?.client.cancel([job.requestId]);
  }

  /**
   * Finish here what runs in the worker, so a read sees the bars' own
   * values: each such indicator, and those reading its lines, computed now.
   */
  settle(): void {
    if (this.jobs.size === 0) return;
    this.host.runPending();
    const jobs = this.jobs;
    this.jobs = new Map();
    this.worker?.client.cancel([...jobs.values()].map((job) => job.requestId));
    for (const instance of this.host.ordered()) {
      const job = jobs.get(instance.config.instanceId) ?? this.jobReadBy(instance, jobs);
      if (job) this.host.compute(instance, job.data, undefined, true);
    }
    // The outputs changed outside a computation the chart asked for: it draws and fits them again.
    this.worker?.onLand?.();
  }

  /** Start a full recompute in the worker, if it takes this one: a built-in, on bars or a price, over enough bars. */
  private send(instance: IndicatorInstance, data: DataSeries): boolean {
    const worker = this.worker;
    const { plugin, config } = instance;
    if (!worker?.client.usable || data.length < worker.minBars || !BUILT_IN_PLUGINS.has(plugin)) return false;
    const source = inputSource(plugin.descriptor, config.params);
    if (source.kind === 'line') return false;
    const id = config.instanceId;
    const bars = this.barsFor(data);
    const job = startWorkerComputation(worker.client, plugin, config, bars, source, (requestId, result) => this.land(id, requestId, result));
    if (!job) return false;
    this.jobs.set(id, job);
    return true;
  }

  /** The bars for the worker: made once a task for every indicator sent with them, which go in one message. */
  private barsFor(data: DataSeries): WorkerBars {
    const shared = this.sharedBars;
    if (shared?.data === data && shared.times.length === data.length) return shared;
    const bars = workerBars(data);
    this.sharedBars = bars;
    queueMicrotask(() => {
      if (this.sharedBars === bars) this.sharedBars = null;
    });
    return bars;
  }

  /** The computation running in the worker that the instance reads a line of, directly or through others. */
  private jobReadBy(instance: IndicatorInstance, jobs: Map<string, WorkerComputation>): WorkerComputation | null {
    if (jobs.size === 0) return null;
    let source = inputSource(instance.plugin.descriptor, instance.config.params);
    const seen = new Set<string>();
    while (source.kind === 'line' && !seen.has(source.instanceId)) {
      const job = jobs.get(source.instanceId);
      if (job) return job;
      seen.add(source.instanceId);
      const next = this.host.instance(source.instanceId);
      if (!next) return null;
      source = inputSource(next.plugin.descriptor, next.config.params);
    }
    return null;
  }

  /**
   * A reply from the worker: put in place, brought up to date with the
   * ticks since, unless a newer computation replaced it; then the
   * indicators reading its lines follow.
   */
  private land(instanceId: string, requestId: number, result: WorkerResult | Error): void {
    const job = this.jobs.get(instanceId);
    if (job?.requestId !== requestId) return;
    // The ticks waiting widen what the reply is brought up to date from;
    // a full recompute waiting replaces it.
    this.host.runPending();
    const instance = this.host.instance(instanceId);
    if (this.jobs.get(instanceId) !== job || !instance) return;
    this.jobs.delete(instanceId);
    this.apply(instance, job, result);
    const readers = new Set(this.host.dependents(instanceId));
    for (const reader of this.host.ordered()) {
      if (readers.has(reader.config.instanceId)) this.host.compute(reader, job.data);
    }
    this.worker?.onLand?.();
  }

  /** The reply as the instance's output, brought up to date; computed here when it can't be. */
  private apply(instance: IndicatorInstance, job: WorkerComputation, result: WorkerResult | Error): void {
    const { plugin, config } = instance;
    // Kept from before the recompute: of no use for its ticks.
    delete instance.sourceBars;
    const reply = result instanceof Error ? null : result;
    const output = reply && bringUpToDate(job, reply, plugin, config, () => sourceBarsOf(instance, job.data));
    if (!output) {
      this.host.compute(instance, job.data, undefined, true);
      return;
    }
    instance.output = output;
    instance.changedFrom = 0;
  }
}

/** The bars the instance computes on (its price source in `close`), kept for its next tick. */
function sourceBarsOf(instance: IndicatorInstance, data: DataSeries): DataSeries {
  const source = inputSource(instance.plugin.descriptor, instance.config.params);
  if (source.kind !== 'price') return data;
  instance.sourceBars = priceSourceBars(data, source.source);
  return instance.sourceBars;
}
