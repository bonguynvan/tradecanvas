import type { IndicatorConfig, IndicatorOutput, PriceSource } from '@tradecanvas/commons';
import type { WorkerLike } from './IndicatorWorkerHost.js';
import { isWorkerResponse } from './messages.js';
import type { IndicatorWorkerJob, IndicatorWorkerRequest } from './messages.js';
import { OutputDecoder, barColumnBuffers } from './columns.js';
import type { BarColumns, OutputColumns } from './columns.js';
import { spawnIndicatorWorker } from './spawnWorker.js';
import { unpackWorkerState } from './workerState.js';

/**
 * How many bars of an output are made into points in one task. A reply
 * over a million bars is rebuilt over twenty tasks of a few milliseconds
 * each, so the page answers input and draws frames meanwhile.
 */
export const DECODE_SLICE_BARS = 50_000;

/** How a client gets its worker: at once, or once its code has loaded. Throwing, or rejecting, means none. */
export type WorkerSpawn = () => WorkerLike | Promise<WorkerLike>;

/** One full computation for the worker. */
export interface WorkerJob {
  indicatorId: string;
  config: IndicatorConfig;
  /** The price the indicator reads in place of the close (none: the close). */
  source?: PriceSource;
  /**
   * The bars as columns. Jobs given the same columns before the next
   * microtask go to the worker in one message, and the columns' buffers
   * with it: they are empty here after.
   */
  bars: BarColumns;
  /** The bars' times, kept here: the output's `values` are keyed by them. */
  times: ArrayLike<number>;
}

/** A job's output, with what the plugin keeps beside it for `update` (`WorkerStateful`). */
export interface WorkerResult {
  output: IndicatorOutput;
  state?: unknown;
}

/** What a job ends with: its result, or why there is none (the caller computes it itself). */
export type WorkerJobDone = (result: WorkerResult | Error) => void;

type ClientState = 'starting' | 'ready' | 'failed' | 'closed';

interface Outgoing {
  message: IndicatorWorkerRequest;
  transfer: ArrayBuffer[];
}

interface Waiting {
  done: WorkerJobDone;
  times: ArrayLike<number>;
}

/** Jobs on one set of bars, sent together at the next microtask. */
interface Batch {
  bars: BarColumns;
  jobs: IndicatorWorkerJob[];
}

/**
 * The page's indicator worker, as the charts use it: jobs in, outputs out,
 * matched by request id. It starts as soon as it is made and answers a ping
 * when it is up. If it cannot be made (no `Worker`, a constructor that
 * throws, as under a Content Security Policy that refuses `blob:`) or reports
 * an error, it fails: every job waiting gets an `Error` and `usable` turns
 * false, so the charts compute on the main thread instead.
 */
export class IndicatorWorkerClient {
  private state: ClientState = 'starting';
  private worker: WorkerLike | null = null;
  /** Messages posted before the worker was there, sent once it is. */
  private outbox: Outgoing[] = [];
  private jobs = new Map<number, Waiting>();
  /** The jobs being gathered on one set of bars. */
  private batch: Batch | null = null;
  private nextId = 1;
  private pingId = 0;
  private readonly onMessage = (ev: MessageEvent | ErrorEvent): void => this.receive((ev as MessageEvent).data);
  private readonly onError = (ev: MessageEvent | ErrorEvent): void =>
    this.fail(new Error((ev as ErrorEvent).message || 'Indicator worker error'));

  constructor(spawn: WorkerSpawn) {
    let made: WorkerLike | Promise<WorkerLike>;
    try {
      made = spawn();
    } catch (err) {
      this.fail(asError(err));
      return;
    }
    if (made instanceof Promise) made.then((worker) => this.attach(worker), (err) => this.fail(asError(err)));
    else this.attach(made);
  }

  /** False once the worker failed or was closed: compute on the main thread. */
  get usable(): boolean {
    return this.state === 'starting' || this.state === 'ready';
  }

  /** True once the worker answered its first ping. */
  get ready(): boolean {
    return this.state === 'ready';
  }

  /** Send a job; its id, for `cancel`, or null when the worker is not usable. */
  submit(job: WorkerJob, done: WorkerJobDone): number | null {
    if (!this.usable) return null;
    const requestId = this.nextId++;
    this.jobs.set(requestId, { done, times: job.times });
    const { indicatorId, config, source, bars } = job;
    this.batchFor(bars).jobs.push({ requestId, indicatorId, config, ...(source ? { source } : {}) });
    return requestId;
  }

  /** The batch gathering jobs on `bars`: a new one, once the last is sent, for other bars. */
  private batchFor(bars: BarColumns): Batch {
    if (this.batch?.bars === bars) return this.batch;
    this.sendBatch();
    const batch: Batch = { bars, jobs: [] };
    this.batch = batch;
    queueMicrotask(() => {
      if (this.batch === batch) this.sendBatch();
    });
    return batch;
  }

  /** Send the jobs gathered, those not cancelled meanwhile. */
  private sendBatch(): void {
    const batch = this.batch;
    this.batch = null;
    const jobs = batch?.jobs.filter((job) => this.jobs.has(job.requestId)) ?? [];
    if (!batch || jobs.length === 0 || !this.usable) return;
    this.send({ message: { type: 'calculate', bars: batch.bars, jobs }, transfer: barColumnBuffers(batch.bars) });
  }

  /** Drop jobs no longer wanted: their replies are ignored, and the worker skips those still queued. */
  cancel(requestIds: readonly number[]): void {
    const unsent = new Set(this.batch?.jobs.map((job) => job.requestId));
    // Those not sent yet are left out of their batch; the worker is told of the others.
    const sent = requestIds.filter((id) => this.jobs.delete(id) && !unsent.has(id));
    if (sent.length > 0 && this.usable) this.send({ message: { type: 'cancel', requestIds: sent }, transfer: [] });
  }

  /** Stop the worker. Jobs still out are dropped without an answer. */
  terminate(): void {
    this.state = 'closed';
    this.jobs.clear();
    this.batch = null;
    this.outbox = [];
    this.detach();
  }

  private attach(worker: WorkerLike): void {
    if (!this.usable) {
      worker.terminate();
      return;
    }
    this.worker = worker;
    worker.addEventListener('message', this.onMessage);
    worker.addEventListener('error', this.onError);
    // A reply that could not be read back: as good as an error.
    worker.addEventListener('messageerror', this.onError);
    this.pingId = this.nextId++;
    worker.postMessage({ type: 'ping', requestId: this.pingId });
    const outbox = this.outbox;
    this.outbox = [];
    for (const each of outbox) worker.postMessage(each.message, each.transfer);
  }

  private send(outgoing: Outgoing): void {
    if (this.worker) this.worker.postMessage(outgoing.message, outgoing.transfer);
    else this.outbox.push(outgoing);
  }

  private receive(data: unknown): void {
    if (!isWorkerResponse(data)) return;
    if (data.type === 'pong') {
      if (data.requestId === this.pingId && this.state === 'starting') this.state = 'ready';
      return;
    }
    const waiting = this.jobs.get(data.requestId);
    if (!waiting) return;
    if (data.type === 'result') {
      this.decode(data.requestId, waiting, data.output);
      return;
    }
    this.jobs.delete(data.requestId);
    waiting.done(new Error(data.message));
  }

  /**
   * Make the reply an output a slice of bars a task (`DECODE_SLICE_BARS`),
   * then hand it over. A job cancelled meanwhile is dropped where it is.
   */
  private decode(requestId: number, waiting: Waiting, columns: OutputColumns): void {
    const decoder = new OutputDecoder(columns, waiting.times);
    const step = (): void => {
      if (this.jobs.get(requestId) !== waiting) return;
      if (!decoder.step(DECODE_SLICE_BARS)) {
        setTimeout(step, 0);
        return;
      }
      this.jobs.delete(requestId);
      waiting.done({ output: decoder.output(), ...(columns.state === undefined ? {} : { state: unpackWorkerState(columns.state) }) });
    };
    step();
  }

  private fail(err: Error): void {
    if (!this.usable) return;
    this.state = 'failed';
    this.outbox = [];
    this.detach();
    this.batch = null;
    const jobs = [...this.jobs.values()];
    this.jobs.clear();
    for (const { done } of jobs) done(err);
  }

  private detach(): void {
    const worker = this.worker;
    if (!worker) return;
    this.worker = null;
    worker.removeEventListener('message', this.onMessage);
    worker.removeEventListener('error', this.onError);
    worker.removeEventListener('messageerror', this.onError);
    worker.terminate();
  }
}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/** A chart's hold on the page's worker; `release` it when the chart goes. */
export interface IndicatorWorkerLease {
  readonly client: IndicatorWorkerClient;
  release(): void;
}

/**
 * One indicator worker for the whole page, shared by every chart on it and
 * stopped when the last one lets go. A worker that failed stays failed until
 * then, so a page whose policy refuses workers does not try for each chart.
 */
export class IndicatorWorkerPool {
  private client: IndicatorWorkerClient | null = null;
  private holders = 0;

  constructor(private readonly spawn: WorkerSpawn = spawnIndicatorWorker) {}

  acquire(): IndicatorWorkerLease {
    const client = (this.client ??= new IndicatorWorkerClient(this.spawn));
    this.holders++;
    let held = true;
    return {
      client,
      release: () => {
        if (!held) return;
        held = false;
        this.holders--;
        if (this.holders === 0 && this.client === client) {
          client.terminate();
          this.client = null;
        }
      },
    };
  }
}

/** The page's pool, which charts with `indicatorWorker: 'auto'` share. */
export const indicatorWorkerPool = new IndicatorWorkerPool();
