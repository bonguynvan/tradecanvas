// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';

const NOW = Date.UTC(2026, 9, 26, 12);
function barsOf(tf: TimeFrame, count: number): OHLCBar[] {
  const ms = timeframeToMs(tf);
  const last = Math.floor(NOW / ms) * ms - ms;
  return Array.from({ length: count }, (_, i) => ({ time: last - (count - 1 - i) * ms, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
}

class FakeChart {
  static last: FakeChart;
  replays: Record<string, unknown>[] = [];
  seeks: number[] = [];
  current = 0;
  barIndex = 0;
  handlers = new Map<string, ((e: { payload: unknown }) => void)[]>();
  bars: OHLCBar[] = barsOf('1h', 500);
  constructor() {
    FakeChart.last = this;
    return new Proxy(this, { get: (t, k, r) => (k in t ? Reflect.get(t, k, r) : () => undefined) });
  }
  on(type: string, fn: (e: { payload: unknown }) => void): () => void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), fn]);
    return () => {};
  }
  emit(type: string, payload: unknown): void { for (const fn of this.handlers.get(type) ?? []) fn({ payload }); }
  replaySeek(i: number): void { this.seeks.push(i); }
  getData(): OHLCBar[] { return this.bars; }
  setData(bars: OHLCBar[]): void { this.bars = bars; }
  getFeatures(): Record<string, boolean> { return {}; }
  replayStart(config: Record<string, unknown>): void { this.replays.push(config); }
  isReplayActive(): boolean { return this.replays.length > 0; }
  getReplayProgress() { return { current: this.current, total: 500, percent: 0 }; }
  getReplayState(): string { return 'paused'; }
  getReplayBarIndex(): number { return this.barIndex; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  isTimeframeAllowed(): boolean { return true; }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getIndicatorSetup(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getRequiredSymbols(): string[] { return []; }
  formatPrice(v: number): string { return v.toFixed(2); }
  roundPrice(v: number): number { return v; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getChartTypeOptions(): unknown { return {}; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));
const { ChartWidget } = await import('../ChartWidget.js');

function feed() {
  return {
    name: 'venue', supportedTimeframes: ['1m', '1h', '1d'] as TimeFrame[],
    connect: () => {}, disconnect: () => {}, getConnectionState: () => 'connected', on: () => {}, off: () => {}, dispose: () => {},
    fetchHistory: vi.fn(async (_s: string, tf: TimeFrame, limit = 500) => barsOf(tf, limit)),
    fetchHistoryBefore: vi.fn(async () => []),
  } as unknown as DataAdapter & { fetchHistory: ReturnType<typeof vi.fn> };
}

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;
beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(() => {
  widget.destroy();
  host.remove();
  vi.unstubAllGlobals();
});
const tick = () => new Promise((r) => setTimeout(r, 0));
const stepMenu = () => host.querySelector<HTMLSelectElement>('.tcw-replay-step')!;

describe('the replay Step menu', () => {
  it('starts on Auto, and the chart replays its bars forming in the finest steps it can fetch', async () => {
    const adapter = feed();
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h', adapter });
    await tick();
    widget.toggleReplay();
    expect(stepMenu().value).toBe('auto');
    expect([...stepMenu().options].map((o) => o.value)).toEqual(['auto', 'bar', '1m', '3m', '5m', '15m', '30m']);
    widget.replayFrom(100);
    await tick();
    expect(FakeChart.last.replays.at(-1)).toMatchObject({ startTime: FakeChart.last.bars[100].time, step: 'auto', animate: true });
    expect(FakeChart.last.replays.at(-1)!.steps).toBeUndefined();
    // The chart fetches the window; the widget no longer asks for the newest minutes.
    expect(adapter.fetchHistory.mock.calls.some((c) => c[1] === '1m')).toBe(false);
  });

  it('takes the host’s step and animation', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h', adapter: feed(), replayStep: 'bar', replayAnimate: false });
    await tick();
    widget.toggleReplay();
    expect(stepMenu().value).toBe('bar');
    widget.replayFrom(100);
    await tick();
    expect(FakeChart.last.replays.at(-1)).toMatchObject({ animate: false });
    expect(FakeChart.last.replays.at(-1)!.step).toBeUndefined();
  });

  it('fetches the finer bars itself, and forms the bars from them, when the feed can’t page back', async () => {
    const adapter = feed() as DataAdapter & { fetchHistory: ReturnType<typeof vi.fn>; fetchHistoryBefore?: unknown };
    delete adapter.fetchHistoryBefore;
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h', adapter, replayStep: '1m' });
    await tick();
    widget.toggleReplay();
    widget.replayFrom(100);
    await tick();
    await tick();
    const config = FakeChart.last.replays.at(-1)!;
    expect(config.animate).toBe(true);
    expect(config.step).toBeUndefined();
    expect((config.steps as unknown[]).length).toBeGreaterThan(0);
    expect(adapter.fetchHistory.mock.calls.some((c) => c[1] === '1m')).toBe(true);
  });

  it('builds the steps from the bars loaded when there is no feed, and animates them', async () => {
    const MIN15 = 15 * 60_000;
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h' });
    widget.setData(Array.from({ length: 64 }, (_, i) => ({ time: i * MIN15, open: 100, high: 101, low: 99, close: 100, volume: 1 })) as never);
    await tick();
    widget.toggleReplay();
    expect(stepMenu().value).toBe('auto');
    widget.replayFrom(8);
    await tick();
    const config = FakeChart.last.replays.at(-1)!;
    expect((config.steps as unknown[]).length).toBe(64); // 15m, the finest the bars have
    expect(config.animate).toBe(true);
  });
});

describe('stepping a replay whose bars form', () => {

  it('completes the bar forming before it steps on, and steps back to the bar before it, whole', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h', adapter: feed() });
    await tick();
    widget.replayFrom(100);
    await tick();
    const fake = FakeChart.last;
    fake.current = 100;
    fake.barIndex = 101; // half drawn
    host.querySelector<HTMLButtonElement>('[data-act="stepForward"]')!.click();
    expect(fake.seeks.at(-1)).toBe(101);
    fake.current = 101;
    fake.barIndex = 101; // whole now
    host.querySelector<HTMLButtonElement>('[data-act="stepForward"]')!.click();
    expect(fake.seeks.at(-1)).toBe(102);
    fake.current = 102;
    fake.barIndex = 103;
    host.querySelector<HTMLButtonElement>('[data-act="stepBack"]')!.click();
    expect(fake.seeks.at(-1)).toBe(102);
  });

  it('says so when the finer bars can’t be fetched', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h', adapter: feed() });
    await tick();
    FakeChart.last.emit('replayStepsLoad', { state: 'error', step: '1m', count: 0, error: 'down' });
    expect(host.textContent).toContain('load the finer bars');
  });
});
