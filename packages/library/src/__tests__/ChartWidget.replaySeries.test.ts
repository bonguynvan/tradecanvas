// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { ChartWidget } from '../widget/ChartWidget.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const END = Date.UTC(2026, 9, 26);
const TF_MS: Record<string, number> = { '15m': 15 * MIN, '1h': HOUR, '4h': 4 * HOUR, '1d': DAY };
const COUNT: Record<string, number> = { '1d': 401, '1h': 5000 };

function series(tfMs: number, n: number, end = END): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => {
    const time = end - (n - 1 - i) * tfMs;
    const p = 100 + Math.sin(time / DAY) * 5;
    return { time, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 10 };
  });
}

/** A venue that answers each history request after `delay[tf]` ms. */
function slowAdapter(delay: Record<string, number>): DataAdapter {
  return {
    name: 'slow',
    supportedTimeframes: ['15m', '1h', '4h', '1d'],
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: (_s: string, tf: TimeFrame, limit?: number) =>
      new Promise((r) => setTimeout(() => r(series(TF_MS[tf], COUNT[tf] ?? Math.min(limit ?? 500, 5000))), delay[tf] ?? 700)),
    // It pages back, so the chart fetches a replay's finer bars and the replay starts at once.
    fetchHistoryBefore: async () => [],
    on: () => {},
    off: () => {},
    dispose: () => {},
  };
}

let host: HTMLDivElement;
let widget: ChartWidget;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  host = sizedHost(1200, 700);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const q = <T extends Element = HTMLElement>(sel: string) => host.querySelector(sel) as T | null;
/** Where the replay is on its track, of how many: what the panel shows of the bars. */
const progress = () => {
  const track = q('.tcw-replay-scrubber') as HTMLInputElement | null;
  return track ? `${Number(track.value) + 1} / ${Number(track.max) + 1}` : null;
};
const clickBar = (barIndex: number) =>
  (widget.getChart() as unknown as { eventBus: { emit(e: string, p: unknown): void } }).eventBus.emit('barClick', { barIndex });

async function dailyWidget(): Promise<void> {
  widget = new ChartWidget(host, { adapter: slowAdapter({ '1d': 700, '1h': 1400 }), symbol: 'BTCUSDT', timeframe: '1d', watchlist: false, historyLimit: 5000 });
  await vi.advanceTimersByTimeAsync(800);
  expect(widget.getChart().getData()).toHaveLength(401);
}

describe('ChartWidget replay while the bars change', () => {
  it('waits for the bars that load: Loading in the hint, Random off, a bar click starts nothing', async () => {
    await dailyWidget();
    void widget.setTimeframe('1h');
    await vi.advanceTimersByTimeAsync(65);
    widget.toggleReplay();
    await vi.advanceTimersByTimeAsync(200);
    const bar = q('.tcw-replay-picking')!; // its controls are busy, not its status region
    expect(bar.getAttribute('aria-busy')).toBe('true');
    expect(q('.tcw-replay-hint')!.textContent).toContain('Loading chart');
    expect(q<HTMLButtonElement>('[data-act="random"]')!.disabled).toBe(true);
    clickBar(354);
    expect(widget.getChart().isReplayActive()).toBe(false);

    await vi.advanceTimersByTimeAsync(1400);
    expect(bar.hasAttribute('aria-busy')).toBe(false);
    expect(q<HTMLButtonElement>('[data-act="random"]')!.disabled).toBe(false);
    clickBar(4954);
    expect(widget.getChart().isReplayActive()).toBe(true);
    expect(progress()).toBe('4955 / 5000');
  });

  it('stays open across a timeframe switch: its controls wait, then the total and the steps follow', async () => {
    await dailyWidget();
    widget.toggleReplay();
    clickBar(354);
    expect(progress()).toBe('355 / 401');
    const until = widget.getChart().getReplayProgress().until!;
    void widget.setTimeframe('1h');
    await vi.advanceTimersByTimeAsync(250);
    expect(q<HTMLButtonElement>('[data-act="stepBack"]')!.disabled).toBe(true);
    expect(q<HTMLInputElement>('.tcw-replay-scrubber')!.disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(1400);
    expect(widget.getChart().isReplayActive()).toBe(true);
    expect(q('.tcw-replay-bar')).not.toBeNull();
    expect(q<HTMLButtonElement>('[data-act="stepBack"]')!.disabled).toBe(false);
    expect(widget.getChart().getData().at(-1)!.time + HOUR).toBe(until);
    expect(progress()).toMatch(/ \/ 5000$/);
    const options = [...host.querySelectorAll<HTMLOptionElement>('[data-act="step"] option')].map((o) => o.value);
    // The 1h interval's steps, not the 1d one's.
    expect(options).toContain('15m');
    expect(options).not.toContain('1h');
  });

  it('never shows Pause without a replay to play', async () => {
    await dailyWidget();
    void widget.setTimeframe('1h');
    await vi.advanceTimersByTimeAsync(65);
    widget.toggleReplay();
    await vi.advanceTimersByTimeAsync(1500);
    clickBar(4000);
    const play = q<HTMLButtonElement>('.tcw-replay-play')!;
    widget.getChart().replayStop(); // the host ends it under the panel
    play.click();
    expect(play.getAttribute('aria-label')).toBe('Play');
  });

  it('goes on playing after a timeframe switch while it plays in steps the widget builds', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1h', watchlist: false });
    widget.setData(series(15 * MIN, 4000));
    await vi.advanceTimersByTimeAsync(50);
    widget.toggleReplay();
    widget.replayFrom(500, true);
    await vi.advanceTimersByTimeAsync(1100);
    expect(widget.getChart().getReplayState()).toBe('playing');
    await widget.setTimeframe('4h');
    await vi.advanceTimersByTimeAsync(1100);
    expect(widget.getChart().getReplayState()).toBe('playing');
    expect(q('.tcw-replay-play')!.getAttribute('aria-label')).toBe('Pause');
  });

  it('keeps its place in the bar when a passed bar is corrected while it plays in steps', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1h', watchlist: false });
    widget.setData(series(15 * MIN, 4000));
    await vi.advanceTimersByTimeAsync(50);
    widget.toggleReplay();
    widget.replayFrom(500, true);
    await vi.advanceTimersByTimeAsync(1100);
    const chart = widget.getChart();
    const start = vi.spyOn(chart, 'replayStart');
    const bar = chart.getData()[400];
    chart.updateBar({ ...bar, close: bar.close + 0.25 });
    await vi.advanceTimersByTimeAsync(50);
    expect(start).not.toHaveBeenCalled();
    expect(chart.getReplayState()).toBe('playing');
  });
});
