// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter } from '@tradecanvas/commons';

const DEFAULTS: Record<string, Record<string, unknown>> = {
  ema: { period: 9, source: 'close' },
  bb: { period: 20, stdDev: 2 },
};

/**
 * Stand-in for the canvas-backed Chart (jsdom has no 2D context). It models
 * just the indicator list and the add/remove events the widget listens to.
 */
class FakeChart {
  static last: FakeChart;
  indicators: { instanceId: string; id: string; params: Record<string, unknown>; visible: boolean }[] = [];
  private seq = 0;
  private listeners = new Map<string, Set<(e: { payload: unknown }) => void>>();

  constructor() {
    FakeChart.last = this;
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

  private emit(event: string, payload: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }

  connect(): Promise<void> { return new Promise(() => {}); }
  isTimeframeAllowed(): boolean { return true; }
  getData(): unknown[] { return []; }

  addIndicator(id: string, params: Record<string, unknown> = {}): string {
    const instanceId = `${id}_${++this.seq}`;
    this.indicators.push({ instanceId, id, params: { ...DEFAULTS[id], ...params }, visible: true });
    this.emit('indicatorAdd', { instanceId, id });
    return instanceId;
  }

  removeIndicator(instanceId: string): void {
    this.indicators = this.indicators.filter((i) => i.instanceId !== instanceId);
    this.emit('indicatorRemove', { instanceId });
  }

  /** Like the real chart: no event, the widget re-reads the list itself. */
  updateIndicator(instanceId: string, params: Record<string, unknown>): void {
    this.indicators = this.indicators.map((i) => (i.instanceId === instanceId ? { ...i, params: { ...i.params, ...params } } : i));
  }

  getActiveIndicators() {
    return this.indicators.map((i) => ({ ...i, descriptor: { id: i.id, defaultConfig: DEFAULTS[i.id] ?? {} } }));
  }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget, indicatorChipLabel } = await import('../ChartWidget.js');

const adapter = { name: 'fake' } as unknown as DataAdapter;
let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

const chips = (): string[] =>
  [...host.querySelectorAll('.tcw-indicator-chip > span')].map((el) => el.textContent ?? '');
const pick = (id: string): void =>
  (host.querySelector(`.tcw-dropdown-item[data-ind="${id}"]`) as HTMLButtonElement).click();
const removeChip = (n: number): void =>
  (host.querySelectorAll('.tcw-indicator-chip .tcw-chip-remove')[n] as HTMLButtonElement).click();

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  widget = new ChartWidget(host, { adapter, symbol: 'AAA', timeframe: '5m', watchlist: false });
});

afterEach(() => {
  widget.destroy();
  host.remove();
});

describe('ChartWidget indicators', () => {
  it('adds another instance each time an indicator is picked', () => {
    pick('ema');
    pick('ema');
    expect(FakeChart.last.indicators.map((i) => i.id)).toEqual(['ema', 'ema']);
    expect(chips()).toEqual(['EMA 9', 'EMA 9']);
  });

  it('removes only the instance whose chip was closed', () => {
    pick('ema');
    pick('ema');
    const [first, second] = FakeChart.last.indicators.map((i) => i.instanceId);
    FakeChart.last.updateIndicator(second, { period: 50 });
    removeChip(0);
    expect(FakeChart.last.indicators.map((i) => i.instanceId)).toEqual([second]);
    expect(FakeChart.last.indicators.map((i) => i.instanceId)).not.toContain(first);
    expect(chips()).toEqual(['EMA 50']);
  });

  it('follows indicators added or removed on the chart directly', () => {
    const id = FakeChart.last.addIndicator('bb', { stdDev: 2.5 });
    expect(chips()).toEqual(['BB 20 2.5']);
    FakeChart.last.removeIndicator(id);
    expect(chips()).toEqual([]);
  });
});

describe('indicatorChipLabel', () => {
  it('lists up to three numeric parameters in the indicator’s own order', () => {
    expect(indicatorChipLabel('macd', { signal: 9, slow: 26, fast: 12 }, { fast: 12, slow: 26, signal: 9 }))
      .toBe('MACD 12 26 9');
    expect(indicatorChipLabel('ema', { period: 20, source: 'close' }, { period: 9, source: 'close' })).toBe('EMA 20');
    expect(indicatorChipLabel('x', { a: 1, b: 2, c: 3, d: 4 })).toBe('X 1 2 3');
  });

  it('rounds long decimals and skips non-numbers', () => {
    expect(indicatorChipLabel('psar', { step: 0.0200000001, max: 0.2 }, { step: 0.02, max: 0.2 })).toBe('PSAR 0.02 0.2');
    expect(indicatorChipLabel('vwap', { anchor: 'session' }, { anchor: 'session' })).toBe('VWAP');
  });
});
