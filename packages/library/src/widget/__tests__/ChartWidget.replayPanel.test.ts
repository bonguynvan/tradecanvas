// @vitest-environment jsdom
// The replay panel in the widget: keys, picking again inside a replay, its
// pace, its readout, the toolbar button, and what it leaves behind.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 22);

/** Stand-in for the canvas-backed Chart, with a replay that records what it is asked. */
class FakeChart {
  static all: FakeChart[] = [];
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.all.push(this);
    return new Proxy(this, {
      get: (target, key, receiver) => (key in target ? Reflect.get(target, key, receiver) : () => undefined),
    });
  }
  on(event: string, cb: (e: { payload: unknown }) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  emit(event: string, payload: unknown = {}): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  getFeatures(): Record<string, boolean> { return {}; }
  barsLoaded = Array.from({ length: 40 }, (_, i) => ({ time: T0 + i * H, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));
  setData(bars: never): void { this.barsLoaded = bars; }
  getData() { return this.barsLoaded; }
  zone: string | null = 'UTC';
  getTimeZone() { return this.zone; }
  // Replay
  replays: Record<string, unknown>[] = [];
  replaying = false;
  current = 10;
  total = 40;
  state = 'paused';
  seeks: number[] = [];
  speeds: number[] = [];
  stops = 0;
  replayStart(config: Record<string, unknown>): void { this.replays.push(config); this.replaying = true; }
  isReplayActive(): boolean { return this.replaying; }
  getReplayProgress() { return { current: this.current, total: this.total, percent: 0 }; }
  getReplayState(): string { return this.state; }
  getReplayBarIndex(): number { return this.current; }
  replaySeek(i: number): void { this.seeks.push(i); this.current = i; }
  replayPause(): void { this.state = 'paused'; }
  replayResume(): void { this.state = 'playing'; }
  replayStop(): void { this.replaying = false; this.stops++; }
  setReplaySpeed(s: number): void { this.speeds.push(s); }
  // What the widget reads while it builds
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorSetup(): unknown[] { return []; }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getIndicatorOutput(): null { return null; }
  getChartTypeOptions(): unknown { return {}; }
  getRequiredSymbols(): string[] { return []; }
  roundPrice(p: number): number { return p; }
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));
const { ChartWidget } = await import('../ChartWidget.js');

type Widget = InstanceType<typeof ChartWidget>;
const hosts: HTMLDivElement[] = [];
const widgets: Widget[] = [];

/** A widget with its bars in (not waiting for a series, so the replay's controls move). */
async function make(options: Record<string, unknown> = {}): Promise<{ host: HTMLDivElement; widget: Widget; chart: FakeChart }> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h', ...options } as never);
  hosts.push(host);
  widgets.push(widget);
  const chart = FakeChart.all.at(-1)!;
  widget.setData(chart.barsLoaded as never);
  await new Promise((r) => setTimeout(r, 0));
  return { host, widget, chart };
}

const press = (el: Element) => el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
};
const container = (host: HTMLElement) => {
  const el = host.querySelector<HTMLElement>('.tcw-chart-container')!;
  el.tabIndex = 0; // the real Chart sets this
  return el;
};
const act = <T extends HTMLElement = HTMLButtonElement>(host: HTMLElement, name: string) =>
  host.querySelector<T>(`[data-act="${name}"]`)!;

beforeEach(() => {
  localStorage.clear();
  FakeChart.all = [];
});

afterEach(() => {
  for (const w of widgets.splice(0)) w.destroy();
  for (const h of hosts.splice(0)) h.remove();
  vi.useRealTimers();
});

describe('replay keys go to the widget that has the keys', () => {
  it('Shift+Right with the second chart focused steps the second replay, not the first', async () => {
    const a = await make();
    const b = await make();
    a.widget.replayFrom(10);
    b.widget.replayFrom(10);
    const target = container(b.host);
    press(target);
    target.focus();
    key(target, 'ArrowRight', { shiftKey: true });
    expect(a.chart.seeks).toEqual([]);
    expect(b.chart.seeks).toEqual([11]);
  });

  it('with a button of the page focused, no replay steps', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    const pageButton = document.createElement('button');
    document.body.appendChild(pageButton);
    press(pageButton);
    pageButton.focus();
    key(pageButton, 'ArrowRight', { shiftKey: true });
    expect(a.chart.seeks).toEqual([]);
    pageButton.remove();
  });

  it('a host shortcut on Shift+Right comes before the replay step', async () => {
    const a = await make();
    const onPress = vi.fn();
    a.widget.addHotkey({ keys: 'Shift+ArrowRight', label: 'Mine', onPress });
    a.widget.replayFrom(10);
    const target = container(a.host);
    press(target);
    target.focus();
    key(target, 'ArrowRight', { shiftKey: true });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(a.chart.seeks).toEqual([]);
  });

  it('Shift+Right on a button in an open dialog does not step the replay behind it', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const inside = document.createElement('button');
    dialog.appendChild(inside);
    a.host.querySelector('.tcw-root')!.appendChild(dialog);
    press(inside);
    inside.focus();
    key(inside, 'ArrowRight', { shiftKey: true });
    expect(a.chart.seeks).toEqual([]);
  });
});

describe('Space during a replay', async () => {
  it('on the chart plays, and stops the key before the chart\'s own Space (fit content, on window)', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    const chartKeys = vi.fn();
    window.addEventListener('keydown', chartKeys);
    try {
      const target = container(a.host);
      press(target);
      target.focus();
      const e = key(target, ' ');
      expect(a.chart.state).toBe('playing');
      expect(e.defaultPrevented).toBe(true);
      expect(chartKeys).not.toHaveBeenCalled();
      key(target, ' ');
      expect(a.chart.state).toBe('paused');
    } finally {
      window.removeEventListener('keydown', chartKeys);
    }
  });

  it('is left to the page with focus on its body, and to the chart with the hotkeys off or while picking', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(key(document.body, ' ').defaultPrevented).toBe(false);
    expect(a.chart.state).toBe('paused');

    const b = await make({ features: { hotkeys: false } });
    b.widget.replayFrom(10);
    const target = container(b.host);
    press(target);
    target.focus();
    expect(key(target, ' ').defaultPrevented).toBe(false);
    expect(b.chart.state).toBe('paused');

    const c = await make();
    c.widget.toggleReplay();
    const picking = container(c.host);
    press(picking);
    picking.focus();
    expect(key(picking, ' ').defaultPrevented).toBe(false);
  });
});

describe('the toolbar button, focus and what the panel leaves', async () => {
  it('shows the Bar replay button as pressed while the replay is open', async () => {
    const a = await make();
    const btn = a.host.querySelector<HTMLButtonElement>('[data-role="replay"]')!;
    btn.click();
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    a.widget.toggleReplay();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('leaving from its bar gives focus back to the toolbar button', async () => {
    const a = await make();
    const btn = a.host.querySelector<HTMLButtonElement>('[data-role="replay"]')!;
    btn.focus();
    btn.click();
    act(a.host, 'random').click();
    const out = act(a.host, 'realtime');
    out.focus();
    out.click();
    expect(a.host.querySelector('.tcw-replay-bar')).toBeNull();
    expect(document.activeElement).toBe(btn);
  });

  it('marks the root while it shows, and clears it when the replay ends elsewhere', async () => {
    const a = await make();
    vi.useFakeTimers();
    const root = a.host.querySelector<HTMLElement>('.tcw-root')!;
    const btn = a.host.querySelector<HTMLButtonElement>('[data-role="replay"]')!;
    a.widget.replayFrom(10);
    expect(root.hasAttribute('data-tcw-replay')).toBe(true);
    expect(root.style.getPropertyValue('--tcw-replay-lift')).not.toBe('');
    // A symbol switch, say: the chart's replay ends, and the poll sees it.
    a.chart.replaying = false;
    vi.advanceTimersByTime(1000);
    expect(a.host.querySelector('.tcw-replay-bar')).toBeNull();
    expect(root.hasAttribute('data-tcw-replay')).toBe(false);
    expect(root.style.getPropertyValue('--tcw-replay-lift')).toBe('');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('sits on the main pane\'s foot, centred on its plot', async () => {
    const a = await make();
    a.chart.getPlotRect = () => ({ x: 0, y: 0, width: 600, height: 300 });
    const cont = container(a.host);
    Object.defineProperty(cont, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(cont, 'clientWidth', { value: 680, configurable: true });
    a.widget.replayFrom(10);
    const bar = a.host.querySelector<HTMLElement>('.tcw-replay-bar')!;
    // 500 − 300 below the main plot (the bottom panes and the time axis): it sits above them.
    expect(bar.style.getPropertyValue('--tcw-replay-foot')).toBe('200px');
    expect(bar.style.getPropertyValue('--tcw-replay-plot-end')).toBe('80px');
  });
});

describe('Select bar: picking again inside the replay', async () => {
  it('pauses and picks without ending the replay; Cancel and Esc go back to it', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    a.chart.state = 'playing';
    act(a.host, 'selectBar').click();
    expect(a.chart.state).toBe('paused');
    expect(a.chart.stops).toBe(0);
    expect(a.chart.replaying).toBe(true);
    expect(a.host.querySelector('.tcw-replay-bar')?.getAttribute('data-mode')).toBe('select');
    expect(a.host.querySelector('.tcw-replay-shade')).not.toBeNull();
    act(a.host, 'cancel').click();
    expect(a.host.querySelector('.tcw-replay-bar')?.getAttribute('data-mode')).toBe('replay');
    expect(a.host.querySelector('.tcw-replay-shade')).toBeNull();

    act(a.host, 'selectBar').click();
    const target = container(a.host);
    press(target);
    target.focus();
    key(target, 'Escape');
    expect(a.host.querySelector('.tcw-replay-bar')?.getAttribute('data-mode')).toBe('replay');
    expect(a.chart.stops).toBe(0);
  });

  it('a bar clicked restarts the replay there', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    act(a.host, 'selectBar').click();
    a.chart.emit('barClick', { barIndex: 5 });
    expect(a.chart.replays).toHaveLength(2);
    expect(a.chart.replays.at(-1)).toMatchObject({ startTime: T0 + 5 * H });
    expect(a.chart.stops).toBe(0);
  });

  // A downstream app switched 1d to 1h and clicked a bar while the hours loaded: the click was
  // dropped, and the panel kept asking for a bar even once they were in.
  it('a bar clicked while the next bars load starts the replay at its time once they come', async () => {
    const a = await make();
    a.widget.toggleReplay();
    const loading = (a.widget as unknown as { loading: { begin(c: boolean, i: boolean): void; end(): void } }).loading;
    loading.begin(true, true);
    (a.widget as unknown as { syncReplayBar(): void }).syncReplayBar();
    const D = 24 * H;
    a.chart.emit('barClick', { barIndex: 3, bar: { time: T0 + 3 * D } });
    expect(a.chart.replays).toHaveLength(0);
    expect(a.host.querySelector('.tcw-replay-bar')?.textContent).toContain('Loading');
    // The hours come: 30 days of them.
    a.chart.barsLoaded = Array.from({ length: 30 * 24 }, (_, i) => ({ time: T0 + i * H, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));
    loading.end();
    (a.widget as unknown as { syncReplayBar(): void }).syncReplayBar();
    expect(a.chart.replays).toHaveLength(1);
    expect(a.chart.replays[0]).toMatchObject({ startTime: T0 + 3 * D });
  });

  it('a bar clicked while the next bars load is let go if they fail, or the pick is cancelled', async () => {
    const a = await make();
    a.widget.toggleReplay();
    const loading = (a.widget as unknown as { loading: { begin(c: boolean, i: boolean): void; fail(m: string): void; end(): void } }).loading;
    loading.begin(true, true);
    a.chart.emit('barClick', { barIndex: 3, bar: { time: T0 + 3 * H } });
    loading.fail('no');
    (a.widget as unknown as { syncReplayBar(): void }).syncReplayBar();
    loading.end();
    (a.widget as unknown as { syncReplayBar(): void }).syncReplayBar();
    expect(a.chart.replays).toHaveLength(0);
  });

  // Another symbol's bars may not reach the time picked: starting at their first or last bar would
  // replay nothing the user chose, so the bar keeps asking for one.
  it('a bar picked while the next bars load is let go when they don\'t hold its time', async () => {
    for (const offset of [-5 * H, 60 * H]) {
      const a = await make();
      a.widget.toggleReplay();
      const loading = (a.widget as unknown as { loading: { begin(c: boolean, i: boolean): void; end(): void } }).loading;
      const sync = () => (a.widget as unknown as { syncReplayBar(): void }).syncReplayBar();
      loading.begin(true, true);
      sync();
      a.chart.emit('barClick', { barIndex: 0, bar: { time: T0 + offset } });
      loading.end();
      sync();
      expect(a.chart.replays).toHaveLength(0);
      expect(a.host.querySelector('.tcw-replay-bar')?.getAttribute('data-mode')).toBe('select');
    }
  });

  it('a bar picked while the next bars load is let go when the pick is cancelled', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    act(a.host, 'selectBar').click();
    const loading = (a.widget as unknown as { loading: { begin(c: boolean, i: boolean): void; end(): void } }).loading;
    const sync = () => (a.widget as unknown as { syncReplayBar(): void }).syncReplayBar();
    loading.begin(true, true);
    a.chart.emit('barClick', { barIndex: 3, bar: { time: T0 + 3 * H } });
    act(a.host, 'cancel').click();
    sync();
    loading.end();
    sync();
    expect(a.chart.replays).toHaveLength(1);
  });

  it('Random bar draws from the chart\'s bars, not the steps of a replay in finer steps', async () => {
    const a = await make();
    a.widget.replayFrom(10);
    a.chart.total = 40 * 60; // the replay counts minutes
    a.chart.emit('replayStep', { barIndex: 10, time: T0 + 10 * H, stepTime: T0 + 10 * H, until: T0 + 11 * H, total: 40, cause: 'seek' });
    act(a.host, 'selectBar').click();
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    act(a.host, 'random').click();
    const start = a.chart.replays.at(-1)!;
    const index = start.startIndex ?? (((start.startTime as number) - T0) / H);
    expect(index).toBeLessThan(40);
  });
});

describe('what the speed means', async () => {
  it('1× is one bar of the chart a second, whatever the step; the default is 1×', async () => {
    const a = await make({ replayAnimate: false, replayStep: 'bar' });
    const bars15 = Array.from({ length: 64 }, (_, i) => ({ time: T0 + i * 15 * 60_000, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
    a.widget.setData(bars15 as never);
    await new Promise((r) => setTimeout(r, 0));
    a.widget.replayFrom(8);
    await new Promise((r) => setTimeout(r, 0));
    const byBar = a.chart.replays.at(-1)!;
    expect(byBar.speed).toBe(1);
    const select = a.host.querySelector<HTMLSelectElement>('.tcw-replay-step')!;
    select.value = '15m';
    select.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    const bySteps = a.chart.replays.at(-1)!;
    expect(bySteps.steps).toBeTruthy();
    const msPerChartBar = (c: Record<string, unknown>, stepsPerBar: number) => ((c.interval as number) / (c.speed as number)) * stepsPerBar;
    expect(msPerChartBar(bySteps, H / (15 * 60_000))).toBe(msPerChartBar(byBar, 1));
  });

  it('a speed picked goes to the chart as the multiplier', async () => {
    const a = await make();
    a.widget.replayFrom(8);
    const speed = act<HTMLSelectElement>(a.host, 'speed');
    speed.value = '5';
    speed.dispatchEvent(new Event('change'));
    expect(a.chart.speeds).toEqual([5]);
  });
});

describe('the readout', async () => {
  it('shows the step\'s time in the display timezone, the year only when it isn\'t this one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 27));
    const a = await make({ locale: 'en' });
    a.chart.zone = 'Asia/Ho_Chi_Minh';
    a.widget.replayFrom(10);
    a.chart.emit('replayStep', { barIndex: 10, time: T0, stepTime: T0 + 5 * 60_000, until: T0 + H, total: 40, cause: 'seek' });
    await Promise.resolve(); // the panel reads the step once the chart is done with it
    const time = a.host.querySelector('[data-tcw="time"]')!.textContent!;
    expect(time).toContain('Oct 22');
    expect(time).toContain('07:05');
    expect(time).not.toContain('2026');
    a.chart.emit('replayStep', { barIndex: 10, time: Date.UTC(2025, 2, 3), stepTime: Date.UTC(2025, 2, 3), until: 0, total: 40, cause: 'seek' });
    await Promise.resolve();
    expect(a.host.querySelector('[data-tcw="time"]')!.textContent).toContain('2025');
  });

  it('shows the date alone on a daily chart', async () => {
    const a = await make({ timeframe: '1d', locale: 'en' });
    a.widget.replayFrom(10);
    a.chart.emit('replayStep', { barIndex: 10, time: T0, stepTime: T0, until: T0 + 24 * H, total: 40, cause: 'seek' });
    await Promise.resolve();
    expect(a.host.querySelector('[data-tcw="time"]')!.textContent).not.toMatch(/\d\d:\d\d/);
  });
});
