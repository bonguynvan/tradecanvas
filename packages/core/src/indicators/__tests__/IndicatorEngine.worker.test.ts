import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, IndicatorOutput, OHLCBar } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';
import { IndicatorWorkerClient } from '../worker/IndicatorWorkerPool.js';
import { InProcessWorker, drain, walkBars } from '../worker/__tests__/workerFixtures.js';
import { EMAIndicator } from '../overlay/EMA.js';
import { RSIIndicator } from '../panel/RSI.js';
import { SMAIndicator } from '../overlay/SMA.js';
import { priceSourceBars } from '../sources.js';

const MIN_BARS = 100;

function setup(options: { minBars?: number } = {}) {
  const worker = new InProcessWorker();
  const client = new IndicatorWorkerClient(() => worker);
  const engine = new IndicatorEngine();
  registerBuiltInIndicators(engine);
  const onLand = vi.fn();
  engine.useWorker(client, { minBars: options.minBars ?? MIN_BARS, onLand });
  return { worker, client, engine, onLand };
}

const ema = (data: DataSeries, period = 20): IndicatorOutput =>
  new EMAIndicator().calculate(data, { id: 'ema', instanceId: 'e', params: { period, source: 'close' } });

/** The forming bar moves, then a new one opens: what a live feed does. */
function tickAndAppend(data: OHLCBar[]): void {
  const last = data[data.length - 1];
  data[data.length - 1] = { ...last, close: last.close * 1.01, high: Math.max(last.high, last.close * 1.01) };
  const prev = data[data.length - 1];
  data.push({ time: prev.time + 60_000, open: prev.close, high: prev.close, low: prev.close, close: prev.close, volume: 5 });
}

describe('IndicatorEngine with a worker', () => {
  it('computes a full recompute over enough bars in the worker, the last output drawn till it lands', async () => {
    const { engine, worker, onLand } = setup();
    const data = walkBars(300);
    const id = engine.addIndicator('ema', { period: 20 }, data);
    expect(engine.peekOutput(id)).toBeNull();
    expect(engine.isComputingInWorker()).toBe(true);
    await drain();
    expect(worker.posted.some((m) => m.type === 'calculate')).toBe(true);
    expect(engine.peekOutput(id)?.series).toEqual(ema(data).series);
    expect(engine.isComputingInWorker()).toBe(false);
    expect(onLand).toHaveBeenCalled();
  });

  it('keeps the last output on screen while the next recompute runs', async () => {
    const { engine } = setup();
    const data = walkBars(300);
    const id = engine.addIndicator('ema', { period: 20 }, data);
    await drain();
    const before = engine.peekOutput(id);
    const next = walkBars(300, 99);
    engine.recalculateAll(next);
    expect(engine.peekOutput(id)).toBe(before);
    await drain();
    expect(engine.peekOutput(id)?.series).toEqual(ema(next).series);
  });

  it('computes on this thread under the threshold', () => {
    const { engine } = setup();
    const data = walkBars(50);
    const id = engine.addIndicator('ema', { period: 20 }, data);
    expect(engine.isComputingInWorker()).toBe(false);
    expect(engine.peekOutput(id)?.series).toEqual(ema(data).series);
  });

  it('finishes a running recompute here when an output is read', async () => {
    const { engine, worker } = setup();
    const data = walkBars(300);
    const id = engine.addIndicator('ema', { period: 20 }, data);
    const read = engine.getOutput(id);
    expect(read?.series).toEqual(ema(data).series);
    expect(engine.isComputingInWorker()).toBe(false);
    await drain();
    // Read in the task that asked for it: never sent.
    expect(worker.posted.filter((m) => m.type === 'calculate')).toHaveLength(0);
    expect(engine.getOutput(id)).toBe(read);
  });

  it('cancels a recompute the worker has, and drops its late reply', async () => {
    const { engine, worker } = setup();
    const data = walkBars(300);
    worker.hold();
    const id = engine.addIndicator('ema', { period: 20 }, data);
    await drain();
    const read = engine.getOutput(id);
    expect(worker.posted.at(-1)).toMatchObject({ type: 'cancel' });
    worker.release();
    await drain();
    expect(engine.getOutput(id)).toBe(read);
  });

  it('finishes running recomputes on flush()', () => {
    const { engine } = setup();
    const data = walkBars(300);
    const id = engine.addIndicator('rsi', { period: 14 }, data);
    engine.flush();
    const rsi = new RSIIndicator().calculate(data, { id: 'rsi', instanceId: 'r', params: { period: 14 } });
    expect(engine.peekOutput(id)?.series).toEqual(rsi.series);
  });

  it('drops the reply of a recompute a newer one replaced', async () => {
    const { engine, worker } = setup();
    const first = walkBars(300, 1);
    const second = walkBars(300, 2);
    worker.hold();
    const id = engine.addIndicator('ema', { period: 20 }, first);
    await drain();
    engine.recalculateAll(second);
    await drain();
    worker.release();
    await drain();
    expect(engine.peekOutput(id)?.series).toEqual(ema(second).series);
  });

  it('brings the reply up to date with ticks that came while it ran', async () => {
    const { engine, worker } = setup();
    const data = walkBars(300);
    worker.hold();
    const id = engine.addIndicator('ema', { period: 20 }, data);
    await drain();
    tickAndAppend(data);
    engine.deferRecalculateFrom(data, data.length - 2);
    engine.peekOutput(id); // a frame: the tick is folded in, the worker's job goes on
    tickAndAppend(data);
    engine.deferRecalculateFrom(data, data.length - 2);
    const update = vi.spyOn(EMAIndicator.prototype, 'update');
    worker.release();
    await drain();
    // From the first bar a tick changed, on the worker's output.
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][3]).toBe(299);
    update.mockRestore();
    const got = engine.peekOutput(id)!.series!;
    const want = ema(data).series!;
    expect(got).toHaveLength(data.length);
    for (let i = 0; i < want.length; i++) {
      if (want[i] === null) expect(got[i]).toBeNull();
      else expect(got[i]?.value).toBeCloseTo(want[i]!.value!, 9);
    }
  });

  it('discards the reply when the series was replaced, and computes the new one', async () => {
    const { engine, worker } = setup();
    const data = walkBars(300);
    worker.hold();
    const id = engine.addIndicator('ema', { period: 20 }, data);
    await drain();
    const other = walkBars(300, 3).map((bar) => ({ ...bar, time: bar.time + 3_600_000 }));
    engine.deferRecalculateFrom(other, other.length - 1);
    worker.release();
    await drain();
    expect(engine.peekOutput(id)?.series).toEqual(ema(other).series);
  });

  it('computes a price source in the worker as on this thread', async () => {
    const { engine } = setup();
    const data = walkBars(300);
    const id = engine.addIndicator('sma', { period: 10, source: 'hl2' }, data);
    await drain();
    const want = new SMAIndicator().calculate(priceSourceBars(data, 'hl2'), { id: 'sma', instanceId: 's', params: { period: 10, source: 'hl2' } });
    expect(engine.peekOutput(id)?.series).toEqual(want.series);
  });

  it('ticks a price source on the new series after a recompute, not on the bars before it', async () => {
    const { engine } = setup();
    const params = { period: 10, source: 'hl2' };
    const first = walkBars(300, 1);
    const id = engine.addIndicator('sma', params, first);
    await drain();
    tickAndAppend(first);
    engine.recalculateFrom(first, first.length - 2);
    const second = walkBars(300, 2);
    engine.recalculateAll(second);
    await drain();
    tickAndAppend(second);
    engine.recalculateFrom(second, second.length - 2);
    const want = new SMAIndicator().calculate(priceSourceBars(second, 'hl2'), { id: 'sma', instanceId: 's', params });
    const got = engine.peekOutput(id)!.series!;
    for (const i of [second.length - 3, second.length - 2, second.length - 1]) expect(got[i]?.value).toBeCloseTo(want.series![i]!.value!, 9);
  });

  it('computes an indicator reading another one\'s line once that one lands', async () => {
    const { engine } = setup();
    const data = walkBars(300);
    const rsi = engine.addIndicator('rsi', { period: 14 }, data);
    const smoothed = engine.addIndicator('sma', { period: 5, source: `${rsi}:value` }, data);
    expect(engine.peekOutput(smoothed)).toBeNull();
    await drain();
    const rsiOut = engine.peekOutput(rsi);
    expect(rsiOut).not.toBeNull();
    const firstValue = rsiOut!.series!.findIndex((p) => p?.value !== undefined);
    expect(engine.peekOutput(smoothed)?.series?.[firstValue + 10]?.value).toBeTypeOf('number');
    const settled = new IndicatorEngine();
    registerBuiltInIndicators(settled);
    const r = settled.addIndicator('rsi', { period: 14 }, data);
    const s = settled.addIndicator('sma', { period: 5, source: `${r}:value` }, data);
    expect(engine.peekOutput(smoothed)?.series).toEqual(settled.getOutput(s)?.series);
  });

  it('computes here when the worker fails', async () => {
    const { engine, worker } = setup();
    const data = walkBars(300);
    worker.hold();
    const id = engine.addIndicator('ema', { period: 20 }, data);
    worker.emit('error', { message: 'gone' } as ErrorEvent);
    expect(engine.isComputingInWorker()).toBe(false);
    expect(engine.peekOutput(id)?.series).toEqual(ema(data).series);
    // And from then on computes here at once.
    engine.recalculateAll(data);
    expect(engine.isComputingInWorker()).toBe(false);
  });

  it('computes here from the start when no worker can be made', () => {
    const engine = new IndicatorEngine();
    registerBuiltInIndicators(engine);
    engine.useWorker(new IndicatorWorkerClient(() => {
      throw new Error('blocked by policy');
    }), { minBars: MIN_BARS });
    const data = walkBars(300);
    const id = engine.addIndicator('ema', { period: 20 }, data);
    expect(engine.peekOutput(id)?.series).toEqual(ema(data).series);
  });

  it('leaves an indicator the host registered on this thread', () => {
    const { engine } = setup();
    engine.register(new EMAIndicator()); // the host's own, under a built-in's id
    const data = walkBars(300);
    engine.addIndicator('ema', { period: 20 }, data);
    expect(engine.isComputingInWorker()).toBe(false);
  });

  it('cancels the recompute of an indicator removed while it runs', async () => {
    const { engine, worker } = setup();
    worker.hold();
    const id = engine.addIndicator('ema', { period: 20 }, walkBars(300));
    await drain();
    engine.removeIndicator(id);
    expect(engine.isComputingInWorker()).toBe(false);
    expect(worker.posted.at(-1)).toMatchObject({ type: 'cancel' });
  });

  it('computes everything here again after useWorker(null)', () => {
    const { engine } = setup();
    const data = walkBars(300);
    const id = engine.addIndicator('ema', { period: 20 }, data);
    engine.useWorker(null);
    expect(engine.isComputingInWorker()).toBe(false);
    expect(engine.peekOutput(id)?.series).toEqual(ema(data).series);
  });
});
