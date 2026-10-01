// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, OHLCBar, StreamConfig } from '@tradecanvas/commons';

/**
 * Stand-in for the canvas-backed Chart (jsdom has no 2D context). Only what
 * the widget's load sequencing relies on is real: data, `dataUpdate` events
 * and `connect()` resolving when the test says the history arrived.
 */
class FakeChart {
  static last: FakeChart;
  data: OHLCBar[] = [];
  connects: { config: StreamConfig; resolve: (outcome: OHLCBar[] | 'failed' | 'superseded') => void }[] = [];
  private listeners = new Map<string, Set<(e: { payload: unknown }) => void>>();

  constructor() {
    FakeChart.last = this;
    // Any method the widget calls that this fake doesn't model is a no-op.
    return new Proxy(this, {
      get: (target, key, receiver) =>
        key in target ? Reflect.get(target, key, receiver) : () => undefined,
    });
  }

  on(event: string, cb: (e: { payload: unknown }) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, payload: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }

  getData(): OHLCBar[] {
    return this.data;
  }

  setData(data: OHLCBar[]): void {
    this.data = data;
    this.emit('dataUpdate', { length: data.length });
  }

  /**
   * Resolves when the test settles it: with history, as a failed fetch (the
   * stream reports an error and keeps retrying), or superseded (its stream
   * was disposed, so nothing reaches the chart).
   */
  connect(config: StreamConfig): Promise<void> {
    return new Promise((resolve) => {
      this.connects.push({
        config,
        resolve: (outcome) => {
          if (outcome === 'failed') this.emit('dataUpdate', { error: 'Failed to fetch' });
          else if (outcome !== 'superseded') this.setData(outcome);
          resolve();
        },
      });
    });
  }

  getIndicators(): unknown[] { return []; }
  getDrawings(): unknown[] { return []; }
  getAlerts(): unknown[] { return []; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');
const { LOADING_SHOW_DELAY_MS } = await import('../WidgetLoadingOverlay.js');

const bars = (n: number, close = 100): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: close, high: close, low: close, close, volume: 1 }));

const adapter = { name: 'fake' } as unknown as DataAdapter;
const overlay = (): HTMLElement => document.querySelector('.tcw-loading-overlay') as HTMLElement;
const visible = (): boolean => !overlay().classList.contains('tcw-loading-overlay--hidden');
const status = (): string => document.querySelector('.tcw-statusbar, .tcw-status-bar')?.textContent ?? '';

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
  vi.useRealTimers();
});

describe('ChartWidget loading state — live adapter', () => {
  beforeEach(() => {
    widget = new ChartWidget(host, { adapter, symbol: 'AAA', timeframe: '5m', watchlist: false });
  });

  it('covers the empty chart until the first history arrives', async () => {
    expect(visible()).toBe(true);
    FakeChart.last.connects[0].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toBe(false);
  });

  it('a fast switch never shows the veil; a slow one does', async () => {
    const chart = FakeChart.last;
    chart.connects[0].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(0);

    void widget.setTimeframe('1h');
    await vi.advanceTimersByTimeAsync(LOADING_SHOW_DELAY_MS - 50);
    chart.connects[1].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(LOADING_SHOW_DELAY_MS);
    expect(visible()).toBe(false);

    void widget.setTimeframe('4h');
    await vi.advanceTimersByTimeAsync(LOADING_SHOW_DELAY_MS);
    expect(visible()).toBe(true);
    expect(overlay().classList.contains('tcw-loading-overlay--veil')).toBe(true);
    chart.connects[2].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toBe(false);
  });

  it('an older connect finishing first neither hides the veil nor reports connected', async () => {
    const chart = FakeChart.last;
    chart.connects[0].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(0);

    void widget.setSymbol('BBB');
    void widget.setSymbol('CCC');
    await vi.advanceTimersByTimeAsync(LOADING_SHOW_DELAY_MS);
    chart.connects[1].resolve('superseded');
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toBe(true);
    expect(status()).not.toContain('Live');

    chart.connects[2].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toBe(false);
    expect(status()).toContain('Live');
  });

  it('a failed load shows why, and a later retry snapshot recovers', async () => {
    const chart = FakeChart.last;
    chart.connects[0].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(0);

    void widget.setSymbol('NOPE');
    chart.connects[1].resolve('failed');
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toBe(true);
    expect(overlay().textContent).toContain('Connection failed');

    // The stream's automatic retry eventually delivers history.
    chart.setData(bars(5));
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toBe(false);
    expect(status()).toContain('Live');
  });

  it('a transient stream error outside a load does not stick in the status bar', async () => {
    const chart = FakeChart.last;
    chart.connects[0].resolve(bars(10));
    await vi.advanceTimersByTimeAsync(0);

    chart.emit('dataUpdate', { error: 'poll failed' });
    expect(status()).toContain('Live');

    chart.emit('dataUpdate', { connection: { state: 'reconnecting' } });
    expect(status()).not.toContain('Live');
    chart.emit('dataUpdate', { connection: { state: 'connected' } });
    expect(status()).toContain('Live');
  });
});

describe('ChartWidget loading state — static data', () => {
  beforeEach(() => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1m', watchlist: false });
  });

  it('hides once the host sets data, even an empty series', () => {
    expect(visible()).toBe(true);
    widget.setData([]);
    expect(visible()).toBe(false);
  });

  it('veils a large local timeframe switch and always clears it', async () => {
    widget.setData(bars(60_000));
    const pending = widget.setTimeframe('5m');
    expect(visible()).toBe(true); // shown before the main thread gets busy
    await vi.advanceTimersByTimeAsync(200);
    await pending;
    expect(visible()).toBe(false);
    expect(FakeChart.last.data.length).toBe(12_000);
  });

  it('setData during a pending slow switch wins and clears the veil', async () => {
    widget.setData(bars(60_000));
    const pending = widget.setTimeframe('5m');
    widget.setData([]);
    await vi.advanceTimersByTimeAsync(200);
    await pending;
    expect(visible()).toBe(false);
    expect(FakeChart.last.data).toEqual([]);
  });
});

describe('ChartWidget status bar — static data', () => {
  it('does not claim to be connecting without an adapter', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1m', watchlist: false });
    expect(status()).not.toContain('Connecting');
  });
});
