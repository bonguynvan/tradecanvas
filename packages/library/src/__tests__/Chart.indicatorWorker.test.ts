// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { INDICATOR_WORKER_MIN_BARS, IndicatorWorkerClient, indicatorWorkerPool } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';
import { InProcessWorker, drain } from '../../../core/src/indicators/worker/__tests__/workerFixtures.js';

const MINUTE = 60_000;
const T0 = Date.UTC(2025, 0, 1);
const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => {
    const close = 100 + Math.sin(i / 7) * 5 + i * 0.001;
    return { time: T0 + i * MINUTE, open: close - 0.5, high: close + 1, low: close - 1, close, volume: 10 + (i % 13) };
  });

const MANY = INDICATOR_WORKER_MIN_BARS + 500;
const hosts: HTMLDivElement[] = [];
const charts: Chart[] = [];

function makeChart(options: ConstructorParameters<typeof Chart>[1] = {}): Chart {
  const host = sizedHost();
  hosts.push(host);
  const chart = new Chart(host, { chartType: 'candlestick', ...options });
  charts.push(chart);
  return chart;
}

/** The page's worker, run in this thread. */
function inProcessPool(): { worker: InProcessWorker; release: ReturnType<typeof vi.fn> } {
  const worker = new InProcessWorker();
  const client = new IndicatorWorkerClient(() => worker);
  const release = vi.fn();
  vi.spyOn(indicatorWorkerPool, 'acquire').mockReturnValue({ client, release });
  return { worker, release };
}

beforeEach(() => installChartStubs());

afterEach(() => {
  for (const chart of charts.splice(0)) chart.destroy();
  for (const host of hosts.splice(0)) host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('indicatorWorker', () => {
  it("'off' (the default) never starts a worker", () => {
    const acquire = vi.spyOn(indicatorWorkerPool, 'acquire');
    const chart = makeChart();
    chart.setData(bars(MANY));
    chart.addIndicator('ema', { period: 20 });
    expect(acquire).not.toHaveBeenCalled();
  });

  it("'auto' without Web Workers (jsdom) computes on the main thread at once", () => {
    const data = bars(MANY);
    const off = makeChart();
    off.setData(data);
    const auto = makeChart({ indicatorWorker: 'auto' });
    auto.setData(data);
    const a = off.addIndicator('macd')!;
    const b = auto.addIndicator('macd')!;
    expect(auto.getIndicatorOutput(b, { drawn: true })?.series).toEqual(off.getIndicatorOutput(a)?.series);
  });

  it("'auto' computes a long series' indicators in the worker and draws them when they land", async () => {
    inProcessPool();
    const data = bars(MANY);
    const off = makeChart();
    off.setData(data);
    const expected = off.getIndicatorOutput(off.addIndicator('rsi', { period: 14 })!);

    const chart = makeChart({ indicatorWorker: 'auto' });
    chart.setData(data);
    const updates = vi.fn();
    chart.on('indicatorUpdate', updates);
    const rsi = chart.addIndicator('rsi', { period: 14 })!;
    expect(chart.getIndicatorOutput(rsi, { drawn: true })).toBeNull();
    await drain(12);
    expect(chart.getIndicatorOutput(rsi, { drawn: true })?.series).toEqual(expected?.series);
    expect(updates).toHaveBeenCalled();
  });

  it('computes an indicator still in the worker at once when its values are read', () => {
    inProcessPool();
    const data = bars(MANY);
    const off = makeChart();
    off.setData(data);
    const expected = off.getIndicatorOutput(off.addIndicator('bb')!);

    const chart = makeChart({ indicatorWorker: 'auto' });
    chart.setData(data);
    const bb = chart.addIndicator('bb')!;
    expect(chart.getIndicatorOutput(bb)?.series).toEqual(expected?.series);
  });

  it('draws and fits again what a read finished on the main thread', async () => {
    inProcessPool();
    const chart = makeChart({ indicatorWorker: 'auto' });
    chart.setData(bars(MANY));
    const updates = vi.fn();
    chart.on('indicatorUpdate', updates);
    const macd = chart.addIndicator('macd')!;
    await Promise.resolve();
    updates.mockClear();
    const draw = vi.spyOn(chart as unknown as { updateViewportAndRender(): void }, 'updateViewportAndRender');
    chart.getIndicatorOutput(macd);
    await Promise.resolve();
    await Promise.resolve();
    expect(draw).toHaveBeenCalled();
    expect(updates).toHaveBeenCalledWith(expect.objectContaining({ payload: { from: 0 } }));
  });

  it('leaves an alert on a line still in the worker for when it lands, without finishing it on a tick', async () => {
    inProcessPool();
    const chart = makeChart({ indicatorWorker: 'auto' });
    const data = bars(MANY);
    chart.setData(data);
    const rsi = chart.addIndicator('rsi', { period: 14 })!;
    chart.addAlert(0, 'greaterThan', 'rsi up', `${rsi}:value`);
    const fired = vi.fn();
    chart.on('alertTriggered', fired);
    const last = data[data.length - 1];
    chart.updateLastBar({ ...last, close: last.close + 0.1 });
    // Not computed on the tick: it is still the worker's.
    expect(chart.getIndicatorOutput(rsi, { drawn: true })).toBeNull();
    await drain(12);
    expect(chart.getIndicatorOutput(rsi, { drawn: true })).not.toBeNull();
    // Its value was taken when it landed: the next tick compares with it, as the next tick after the first does with 'off'.
    chart.updateLastBar({ ...last, close: last.close + 0.2 });
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('cancels its recomputes in the worker when destroyed, so none lands on it', async () => {
    const { worker } = inProcessPool();
    worker.hold();
    const chart = makeChart({ indicatorWorker: 'auto' });
    chart.setData(bars(MANY));
    chart.addIndicator('ema');
    await drain();
    const draw = vi.spyOn(chart as unknown as { updateViewportAndRender(): void }, 'updateViewportAndRender');
    chart.destroy();
    charts.splice(charts.indexOf(chart), 1);
    expect(worker.posted.at(-1)).toMatchObject({ type: 'cancel' });
    worker.release();
    await drain();
    expect(draw).not.toHaveBeenCalled();
  });

  it('keeps a short series on the main thread', () => {
    const { worker } = inProcessPool();
    const chart = makeChart({ indicatorWorker: 'auto' });
    chart.setData(bars(500));
    const ema = chart.addIndicator('ema')!;
    expect(chart.getIndicatorOutput(ema, { drawn: true })).not.toBeNull();
    expect(worker.posted.filter((m) => m.type === 'calculate')).toHaveLength(0);
  });

  it('lets go of the worker when destroyed', () => {
    const { release } = inProcessPool();
    const chart = makeChart({ indicatorWorker: 'auto' });
    chart.destroy();
    charts.splice(charts.indexOf(chart), 1);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
