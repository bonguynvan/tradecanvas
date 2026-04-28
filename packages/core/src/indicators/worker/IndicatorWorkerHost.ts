import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorPlugin,
} from '@tradecanvas/commons';
import { isWorkerResponse } from './messages.js';
import type { IndicatorWorkerRequest, IndicatorWorkerResponse } from './messages.js';

/**
 * A minimal worker shape — easier to mock than the full DOM `Worker`.
 * Real `Worker` instances satisfy this interface; tests can pass a stub.
 */
export interface WorkerLike {
  postMessage(msg: unknown): void;
  addEventListener(
    type: 'message' | 'error' | 'messageerror',
    listener: (ev: MessageEvent | ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: 'message' | 'error' | 'messageerror',
    listener: (ev: MessageEvent | ErrorEvent) => void,
  ): void;
  terminate(): void;
}

interface PendingRequest {
  resolve: (output: IndicatorOutput) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface IndicatorWorkerHostOptions {
  /** Synchronous fallback registry. Used when no worker is provided. */
  fallbackPlugins?: Map<string, IndicatorPlugin>;
  /** Per-request timeout in ms. Default 30s. Set to 0 to disable. */
  timeoutMs?: number;
}

/**
 * Main-thread façade for indicator calculations. When a `Worker` is provided,
 * `calculate()` posts the request and resolves with the worker's response.
 * Without a worker, it falls back to synchronous calculation against
 * `fallbackPlugins` — useful for SSR, tests, or as a safety net.
 *
 * Render is intentionally NOT routed through the worker because it needs
 * `CanvasRenderingContext2D`. This class only offloads `calculate()`.
 */
export class IndicatorWorkerHost {
  private worker: WorkerLike | null;
  private fallbackPlugins: Map<string, IndicatorPlugin>;
  private timeoutMs: number;
  private nextRequestId = 1;
  private pending = new Map<number, PendingRequest>();
  private messageHandler: (ev: MessageEvent | ErrorEvent) => void;

  constructor(worker: WorkerLike | null, options: IndicatorWorkerHostOptions = {}) {
    this.worker = worker;
    this.fallbackPlugins = options.fallbackPlugins ?? new Map();
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.messageHandler = (ev) => this.handleMessage(ev);
    if (this.worker) {
      this.worker.addEventListener('message', this.messageHandler);
      this.worker.addEventListener('error', this.messageHandler);
    }
  }

  /** True when a worker is attached. False means calls run synchronously. */
  hasWorker(): boolean {
    return this.worker !== null;
  }

  registerFallbackPlugin(plugin: IndicatorPlugin): void {
    this.fallbackPlugins.set(plugin.descriptor.id, plugin);
  }

  /**
   * Compute an indicator output. Routes through the worker when present,
   * otherwise calls the fallback plugin synchronously.
   */
  async calculate(
    indicatorId: string,
    config: IndicatorConfig,
    data: DataSeries,
  ): Promise<IndicatorOutput> {
    if (!this.worker) {
      const plugin = this.fallbackPlugins.get(indicatorId);
      if (!plugin) throw new Error(`Unknown indicator: ${indicatorId}`);
      return plugin.calculate(data, config);
    }

    const requestId = this.nextRequestId++;
    const req: IndicatorWorkerRequest = {
      type: 'calculate',
      requestId,
      indicatorId,
      config,
      data,
    };

    return new Promise<IndicatorOutput>((resolve, reject) => {
      const entry: PendingRequest = { resolve, reject, timer: null };
      if (this.timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          this.pending.delete(requestId);
          reject(new Error(`Indicator worker timeout (${this.timeoutMs}ms): ${indicatorId}`));
        }, this.timeoutMs);
      }
      this.pending.set(requestId, entry);
      this.worker!.postMessage(req);
    });
  }

  /** Issue a ping; resolves when the worker responds. Useful for health checks. */
  ping(): Promise<void> {
    if (!this.worker) return Promise.resolve();
    const requestId = this.nextRequestId++;
    return new Promise<void>((resolve, reject) => {
      const entry: PendingRequest = {
        resolve: () => resolve(),
        reject,
        timer:
          this.timeoutMs > 0
            ? setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error('Indicator worker ping timeout'));
              }, this.timeoutMs)
            : null,
      };
      this.pending.set(requestId, entry);
      this.worker!.postMessage({ type: 'ping', requestId });
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.removeEventListener('message', this.messageHandler);
      this.worker.removeEventListener('error', this.messageHandler);
      this.worker.terminate();
      this.worker = null;
    }
    for (const entry of this.pending.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error('Indicator worker terminated'));
    }
    this.pending.clear();
  }

  private handleMessage(ev: MessageEvent | ErrorEvent): void {
    const data = (ev as MessageEvent).data;
    if (data !== undefined) {
      if (!isWorkerResponse(data)) return;
      this.dispatchResponse(data);
      return;
    }

    // No data field → treat as an error event. Reject all pending requests.
    const message = (ev as ErrorEvent).message ?? 'Indicator worker error';
    for (const [id, entry] of this.pending) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error(message));
      this.pending.delete(id);
    }
  }

  private dispatchResponse(res: IndicatorWorkerResponse): void {
    const entry = this.pending.get(res.requestId);
    if (!entry) return;
    this.pending.delete(res.requestId);
    if (entry.timer) clearTimeout(entry.timer);

    if (res.type === 'error') {
      entry.reject(new Error(res.message));
      return;
    }
    if (res.type === 'pong') {
      entry.resolve(undefined as unknown as IndicatorOutput);
      return;
    }
    entry.resolve(res.output);
  }
}
