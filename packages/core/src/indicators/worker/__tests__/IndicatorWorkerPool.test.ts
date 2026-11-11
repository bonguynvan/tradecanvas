import { describe, it, expect, vi } from 'vitest';
import { DECODE_SLICE_BARS, IndicatorWorkerClient, IndicatorWorkerPool } from '../IndicatorWorkerPool.js';
import type { WorkerResult } from '../IndicatorWorkerPool.js';
import { OutputDecoder, barsToColumns } from '../columns.js';
import { spawnIndicatorWorker } from '../spawnWorker.js';
import { SMAIndicator } from '../../overlay/SMA.js';
import { InProcessWorker, drain, walkBars } from './workerFixtures.js';

const BARS = walkBars(100);
const CONFIG = { id: 'sma', instanceId: 's', params: { period: 10 } };
const job = () => ({ indicatorId: 'sma', config: CONFIG, bars: barsToColumns(BARS), times: BARS.map((b) => b.time) });

describe('IndicatorWorkerClient', () => {
  it('runs a job in the worker and answers with the output', async () => {
    const client = new IndicatorWorkerClient(() => new InProcessWorker());
    let result: WorkerResult | Error | null = null;
    client.submit(job(), (r) => (result = r));
    await drain();
    expect(client.ready).toBe(true);
    expect((result as WorkerResult | null)?.output.series).toEqual(new SMAIndicator().calculate(BARS, CONFIG).series);
  });

  it('hands the bar columns over instead of copying them, once for every job on them', async () => {
    const worker = new InProcessWorker();
    const sent: { msg: unknown; transfer: unknown[] }[] = [];
    worker.postMessage = (msg: unknown, transfer?: Transferable[]) => void sent.push({ msg, transfer: transfer ?? [] });
    const client = new IndicatorWorkerClient(() => worker);
    const shared = job();
    client.submit(shared, () => {});
    client.submit({ ...shared, indicatorId: 'ema' }, () => {});
    await Promise.resolve();
    const calculate = sent.filter((s) => (s.msg as { type: string }).type === 'calculate');
    expect(calculate).toHaveLength(1);
    expect(calculate[0].transfer).toHaveLength(6);
    expect((calculate[0].msg as { jobs: unknown[] }).jobs).toHaveLength(2);
  });

  it('is not usable where the worker cannot be made', () => {
    const client = new IndicatorWorkerClient(() => {
      throw new Error('refused by policy');
    });
    expect(client.usable).toBe(false);
    expect(client.submit(job(), () => {})).toBeNull();
  });

  it('fails where there is no Worker at all (jsdom, a server)', () => {
    expect(typeof Worker).toBe('undefined');
    expect(new IndicatorWorkerClient(spawnIndicatorWorker).usable).toBe(false);
  });

  it('fails when the worker reports an error before its first pong, and gives each job the error', async () => {
    const worker = new InProcessWorker();
    worker.hold();
    const client = new IndicatorWorkerClient(() => worker);
    const results: (WorkerResult | Error)[] = [];
    client.submit(job(), (r) => results.push(r));
    worker.emit('error', { message: 'blocked' } as ErrorEvent);
    expect(client.usable).toBe(false);
    expect(worker.terminated).toBe(true);
    expect(results[0]).toBeInstanceOf(Error);
  });

  it('fails when the worker cannot be loaded', async () => {
    const client = new IndicatorWorkerClient(() => Promise.reject(new Error('chunk failed')));
    const results: (WorkerResult | Error)[] = [];
    client.submit(job(), (r) => results.push(r));
    await drain();
    expect(client.usable).toBe(false);
    expect(results[0]).toBeInstanceOf(Error);
  });

  it('sends what was submitted before the worker loaded once it has', async () => {
    let resolve: (w: InProcessWorker) => void = () => {};
    const client = new IndicatorWorkerClient(() => new Promise<InProcessWorker>((r) => (resolve = r)));
    const results: (WorkerResult | Error)[] = [];
    client.submit(job(), (r) => results.push(r));
    resolve(new InProcessWorker());
    await drain();
    expect(results).toHaveLength(1);
    expect(results[0]).not.toBeInstanceOf(Error);
  });

  it('drops the answer to a cancelled job, and the worker skips it', async () => {
    const worker = new InProcessWorker();
    const client = new IndicatorWorkerClient(() => worker);
    const results: (WorkerResult | Error)[] = [];
    worker.hold();
    const id = client.submit(job(), (r) => results.push(r))!;
    await Promise.resolve();
    client.cancel([id]);
    worker.release();
    await drain();
    expect(results).toEqual([]);
    expect(worker.posted.map((m) => m.type)).toEqual(['ping', 'calculate', 'cancel']);
  });

  it('never sends a job cancelled before its batch went', async () => {
    const worker = new InProcessWorker();
    const client = new IndicatorWorkerClient(() => worker);
    const id = client.submit(job(), () => {})!;
    client.cancel([id]);
    await drain();
    expect(worker.posted.map((m) => m.type)).toEqual(['ping']);
  });
});

describe('IndicatorWorkerClient with a long reply', () => {
  const LONG = walkBars(DECODE_SLICE_BARS * 2 + 10);
  const longJob = () => ({ indicatorId: 'sma', config: CONFIG, bars: barsToColumns(LONG), times: LONG.map((b) => b.time) });

  it('rebuilds it a slice of bars a task, and answers once every bar is done', async () => {
    const worker = new InProcessWorker();
    const client = new IndicatorWorkerClient(() => worker);
    const step = vi.spyOn(OutputDecoder.prototype, 'step');
    let result: WorkerResult | Error | null = null;
    client.submit(longJob(), (r) => (result = r));
    await drain(16);
    expect(step.mock.calls.map((call) => call[0])).toEqual([DECODE_SLICE_BARS, DECODE_SLICE_BARS, DECODE_SLICE_BARS]);
    expect((result as WorkerResult | null)?.output.series).toEqual(new SMAIndicator().calculate(LONG, CONFIG).series);
    step.mockRestore();
  });

  it('drops a reply cancelled while it is rebuilt', async () => {
    const worker = new InProcessWorker();
    const client = new IndicatorWorkerClient(() => worker);
    const results: (WorkerResult | Error)[] = [];
    const id = client.submit(longJob(), (r) => results.push(r))!;
    await drain(3);
    client.cancel([id]);
    await drain(12);
    expect(results).toEqual([]);
  });
});

describe('IndicatorWorkerPool', () => {
  it('shares one worker among its holders and stops it when the last lets go', () => {
    const made: InProcessWorker[] = [];
    const pool = new IndicatorWorkerPool(() => {
      const w = new InProcessWorker();
      made.push(w);
      return w;
    });
    const a = pool.acquire();
    const b = pool.acquire();
    expect(a.client).toBe(b.client);
    expect(made).toHaveLength(1);
    a.release();
    a.release(); // twice is once
    expect(made[0].terminated).toBe(false);
    b.release();
    expect(made[0].terminated).toBe(true);
    pool.acquire();
    expect(made).toHaveLength(2);
  });
});
