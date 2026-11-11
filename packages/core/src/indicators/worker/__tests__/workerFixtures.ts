import type { OHLCBar } from '@tradecanvas/commons';
import type { WorkerLike } from '../IndicatorWorkerHost.js';
import type { IndicatorWorkerRequest } from '../messages.js';
import { createIndicatorWorkerHandler } from '../workerHandler.js';

/** A deterministic random walk over minutes, so a failure can be reproduced. */
export function walkBars(n: number, seed = 7): OHLCBar[] {
  let s = seed;
  const rnd = (): number => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const out: OHLCBar[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const open = price;
    const close = open * (1 + (rnd() - 0.5) * 0.02);
    out.push({
      time: 1_700_000_000_000 + i * 60_000,
      open,
      close,
      high: Math.max(open, close) * (1 + rnd() * 0.005),
      low: Math.min(open, close) * (1 - rnd() * 0.005),
      volume: 10 + rnd() * 1000,
    });
    price = close;
  }
  return out;
}

type Listener = (ev: MessageEvent | ErrorEvent) => void;

/**
 * A worker that runs the real worker's message handler in this thread. Each
 * message is copied as `postMessage` would copy it and handled a task later,
 * so replies arrive after the code that posted has finished, as they do.
 * `hold()` keeps replies back until `release()`, to land them on cue.
 */
export class InProcessWorker implements WorkerLike {
  readonly posted: IndicatorWorkerRequest[] = [];
  terminated = false;
  private listeners = new Map<string, Set<Listener>>();
  private held: (() => void)[] | null = null;
  private handle = createIndicatorWorkerHandler(
    (message) => this.deliver(() => this.emit('message', { data: structuredClone(message) } as MessageEvent)),
    (run) => setTimeout(run, 0),
  );

  postMessage(msg: unknown): void {
    const request = structuredClone(msg) as IndicatorWorkerRequest;
    this.posted.push(request);
    setTimeout(() => {
      if (!this.terminated) this.handle(request);
    }, 0);
  }

  addEventListener(type: string, listener: Listener): void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Keep replies back from now on. */
  hold(): void {
    this.held ??= [];
  }

  /** Deliver the replies kept back, and those that come after. */
  release(): void {
    const held = this.held ?? [];
    this.held = null;
    for (const send of held) send();
  }

  emit(type: 'message' | 'error', ev: MessageEvent | ErrorEvent): void {
    if (this.terminated) return;
    this.listeners.get(type)?.forEach((listener) => listener(ev));
  }

  private deliver(send: () => void): void {
    if (this.held) this.held.push(send);
    else send();
  }
}

/** Wait for every timer and microtask queued so far, and those they queue, a few rounds deep. */
export async function drain(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}
