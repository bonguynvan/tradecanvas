import { describe, it, expect, vi } from 'vitest';
import type { IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorWorkerHost } from '../IndicatorWorkerHost.js';
import type { WorkerLike } from '../IndicatorWorkerHost.js';
import type { IndicatorWorkerRequest, IndicatorWorkerResponse } from '../messages.js';
import { SMAIndicator } from '../../overlay/SMA.js';
import { bars, indicatorConfig } from '../../__tests__/fixtures.js';

/** A WorkerLike stub that synchronously dispatches a programmable response. */
class MockWorker implements WorkerLike {
  posted: IndicatorWorkerRequest[] = [];
  private listeners = new Map<string, Set<(ev: MessageEvent | ErrorEvent) => void>>();
  terminated = false;

  responder: ((req: IndicatorWorkerRequest) => IndicatorWorkerResponse | null) | null = null;

  postMessage(msg: unknown): void {
    const req = msg as IndicatorWorkerRequest;
    this.posted.push(req);
    if (!this.responder) return;
    const res = this.responder(req);
    if (!res) return;
    queueMicrotask(() => this.dispatch('message', { data: res } as MessageEvent));
  }

  addEventListener(type: string, listener: (ev: MessageEvent | ErrorEvent) => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: (ev: MessageEvent | ErrorEvent) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  terminate(): void {
    this.terminated = true;
  }

  dispatch(type: 'message' | 'error', ev: MessageEvent | ErrorEvent): void {
    this.listeners.get(type)?.forEach((l) => l(ev));
  }
}

describe('IndicatorWorkerHost — worker path', () => {
  it('round-trips a calculate request through the worker and resolves with the output', async () => {
    const worker = new MockWorker();
    const expected: IndicatorOutput = { values: new Map([[0, { value: 42 }]]) };
    worker.responder = (req) =>
      req.type === 'calculate'
        ? { type: 'result', requestId: req.requestId, output: expected }
        : null;

    const host = new IndicatorWorkerHost(worker);
    const data = bars([1, 2, 3, 4, 5]);
    const out = await host.calculate('sma', indicatorConfig('sma', { period: 3 }), data);

    expect(out).toEqual(expected);
    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0].type).toBe('calculate');
  });

  it('rejects when the worker returns an error response', async () => {
    const worker = new MockWorker();
    worker.responder = (req) => ({
      type: 'error',
      requestId: req.requestId,
      message: 'boom',
    });
    const host = new IndicatorWorkerHost(worker);
    await expect(
      host.calculate('sma', indicatorConfig('sma', { period: 3 }), bars([1, 2])),
    ).rejects.toThrow('boom');
  });

  it('rejects with a timeout error when the worker never responds', async () => {
    vi.useFakeTimers();
    const worker = new MockWorker();
    worker.responder = () => null; // never responds
    const host = new IndicatorWorkerHost(worker, { timeoutMs: 100 });

    const promise = host.calculate('sma', indicatorConfig('sma', { period: 3 }), bars([1]));
    const assertion = expect(promise).rejects.toThrow(/timeout/i);
    await vi.advanceTimersByTimeAsync(150);
    await assertion;
    vi.useRealTimers();
  });

  it('ignores responses with unrecognized requestIds', async () => {
    const worker = new MockWorker();
    const host = new IndicatorWorkerHost(worker);
    // Should be a no-op — no pending request.
    worker.dispatch('message', {
      data: { type: 'result', requestId: 999, output: { values: new Map() } },
    } as MessageEvent);
    expect(worker.posted).toHaveLength(0);
  });

  it('terminate() rejects pending requests and stops the worker', async () => {
    const worker = new MockWorker();
    worker.responder = () => null;
    const host = new IndicatorWorkerHost(worker, { timeoutMs: 0 });

    const pending = host.calculate('sma', indicatorConfig('sma', { period: 3 }), bars([1]));
    host.terminate();

    await expect(pending).rejects.toThrow(/terminated/);
    expect(worker.terminated).toBe(true);
  });

  it('ping() resolves once the worker responds with pong', async () => {
    const worker = new MockWorker();
    worker.responder = (req) =>
      req.type === 'ping' ? { type: 'pong', requestId: req.requestId } : null;
    const host = new IndicatorWorkerHost(worker);
    await expect(host.ping()).resolves.toBeUndefined();
  });
});

describe('IndicatorWorkerHost — fallback path (no worker)', () => {
  it('runs the registered fallback plugin synchronously', async () => {
    const host = new IndicatorWorkerHost(null);
    host.registerFallbackPlugin(new SMAIndicator());

    const data = bars([1, 2, 3, 4, 5]);
    const out = await host.calculate(
      'sma',
      indicatorConfig('sma', { period: 3 }),
      data,
    );
    expect(out.series![2]?.value).toBeCloseTo(2);
    expect(out.series![4]?.value).toBeCloseTo(4);
  });

  it('rejects when no fallback plugin is registered for the indicator id', async () => {
    const host = new IndicatorWorkerHost(null);
    await expect(
      host.calculate('unknown', indicatorConfig('unknown', {}), bars([1, 2])),
    ).rejects.toThrow(/Unknown indicator/);
  });

  it('hasWorker() reports false when constructed with null', () => {
    const host = new IndicatorWorkerHost(null);
    expect(host.hasWorker()).toBe(false);
  });

  it('ping() resolves immediately without a worker', async () => {
    const host = new IndicatorWorkerHost(null);
    await expect(host.ping()).resolves.toBeUndefined();
  });
});
