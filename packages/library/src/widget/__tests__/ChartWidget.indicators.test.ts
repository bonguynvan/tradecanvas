// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, IndicatorDescriptor } from '@tradecanvas/commons';
import { IndicatorEngine, registerBuiltInIndicators } from '@tradecanvas/core';

/** The real descriptors: their plots and short names drive the legend. */
const builtIns = new IndicatorEngine();
registerBuiltInIndicators(builtIns);
const DESCRIPTORS = new Map<string, IndicatorDescriptor>(builtIns.getAvailableIndicators().map((d) => [d.id, d]));
const PALETTE = ['#4c8dff', '#ff9f43', '#2ecc71', '#e74c3c'];
const BLUE = 'rgb(76, 141, 255)';
const ORANGE = 'rgb(255, 159, 67)';

const DEFAULTS: Record<string, Record<string, unknown>> = {
  ema: { period: 9, source: 'close' },
  bb: { period: 20, stdDev: 2 },
  rsi: { period: 14 },
  psar: { step: 0.02, max: 0.2 },
  wma: { period: 9 },
  macd: { fast: 12, slow: 26, signal: 9 },
};
const BARS = 10;
/**
 * Each indicator's output at bar `i`: one line, three lines, a pane value,
 * a line plus a trend flag, the bar number (plus `FakeChart.bump`), and two
 * lines once warmed up.
 */
const OUTPUT: Record<string, (i: number) => Record<string, number>> = {
  ema: () => ({ value: 101.5 }),
  bb: () => ({ upper: 105, middle: 101, lower: 97 }),
  rsi: () => ({ value: 54.321 }),
  psar: () => ({ value: 99.5, trend: 1 }),
  wma: (i) => ({ value: i + FakeChart.last.bump }),
  macd: (i) => (i < 5 ? { macd: 0.5 } : { macd: 0.5, signal: 0.4 }),
};

/**
 * Stand-in for the canvas-backed Chart (jsdom has no 2D context). It models
 * the indicator list, their outputs and panes, and the events the widget
 * listens to.
 */
class FakeChart {
  static last: FakeChart;
  indicators: { instanceId: string; id: string; params: Record<string, unknown>; visible: boolean; shown?: boolean }[] = [];
  styleDefaults = new Map<string, unknown>();
  bump = 0;
  timeAligned = true;
  // The account panel reads these on its frame.
  // The chart also has Compare's own indicators, which need a second symbol.
  getAvailableIndicators(): IndicatorDescriptor[] {
    return [...DESCRIPTORS.values(), { id: 'compareSymbol', name: 'Compare Symbol', placement: 'overlay', defaultConfig: { symbol: '' } }];
  }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
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

  emit(event: string, payload: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }

  connect(): Promise<void> { return new Promise(() => {}); }
  isTimeframeAllowed(): boolean { return true; }
  getDrawings(): unknown[] { return []; }
  getData(): unknown[] { return Array.from({ length: BARS }, (_, i) => ({ time: i, open: 1, high: 1, low: 1, close: 1, volume: 1 })); }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return this.timeAligned; }
  getIndicatorStyle() { return { colors: [...PALETTE], lineWidths: [1.5], opacity: 1 }; }
  formatPrice(v: number): string { return v.toFixed(2); }
  getIndicatorPanes() {
    return this.indicators.filter((i) => i.id === 'rsi').map((i, n) => ({ instanceId: i.instanceId, rect: { x: 0, y: 300 + n * 100, width: 600, height: 100 } }));
  }
  getIndicatorOutput(instanceId: string) {
    const ind = this.indicators.find((i) => i.instanceId === instanceId);
    return ind ? { series: Array.from({ length: BARS }, (_, i) => OUTPUT[ind.id](i)) } : null;
  }

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

  setIndicatorVisible(instanceId: string, visible: boolean): void {
    this.indicators = this.indicators.map((i) => (i.instanceId === instanceId ? { ...i, visible } : i));
  }

  /** Like the real chart: no event, the widget re-reads the list itself. */
  updateIndicator(instanceId: string, params: Record<string, unknown>): void {
    this.indicators = this.indicators.map((i) => (i.instanceId === instanceId ? { ...i, params: { ...i.params, ...params } } : i));
  }

  getActiveIndicators() {
    return this.indicators.map((i) => ({ ...i, shown: i.shown ?? i.visible, descriptor: { ...DESCRIPTORS.get(i.id)!, defaultConfig: DEFAULTS[i.id] ?? {} } }));
  }

  setIndicatorDefaults(id: string, style: unknown): void { this.styleDefaults.set(id, style); }

  /** The percent compare lines, as the real chart keeps them. */
  compareLines: { id: string; label: string; color: string; visible: boolean }[] = [];
  compareAsked: (number | undefined)[] = [];
  addCompareSymbol(id: string, label: string, _data: unknown, color: string): void {
    this.compareLines.push({ id, label, color, visible: true });
  }
  removeCompareSymbol(id: string): void { this.compareLines = this.compareLines.filter((c) => c.id !== id); }
  setCompareVisible(id: string, visible: boolean): void {
    this.compareLines = this.compareLines.map((c) => (c.id === id ? { ...c, visible } : c));
  }
  /** Every compare at 0.1002, down 7.69% since its first bar on screen. */
  getCompareValues(barIndex?: number) {
    this.compareAsked.push(barIndex);
    return this.compareLines.map((c) => ({ ...c, close: 0.1002, change: -7.6912, stale: false }));
  }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget, indicatorChipLabel } = await import('../ChartWidget.js');

const adapter = { name: 'fake' } as unknown as DataAdapter;
let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

/** The legend redraws on the next frame. */
const frame = () => new Promise((r) => setTimeout(r, 40));
const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-ind-legend-row')];
const names = () => rows().map((r) => r.querySelector('.tcw-ind-legend-name')!.textContent);
const values = (row: HTMLElement) => [...row.querySelectorAll<HTMLElement>('.tcw-ind-legend-values > span')];
const act = (row: HTMLElement, a: string) => row.querySelector<HTMLButtonElement>(`[data-act="${a}"]`)!.click();
/** Add an indicator from the indicators dialog, opening it first. */
const pick = (id: string): void => {
  if (!document.querySelector('.tcw-ip')) host.querySelector<HTMLButtonElement>('[data-role="indicators"]')!.click();
  document.querySelector<HTMLButtonElement>(`.tcw-ip-add[data-ind="${id}"]`)!.click();
};

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
  it('adds another instance each time an indicator is picked, listed on the chart', async () => {
    pick('ema');
    pick('ema');
    await frame();
    expect(FakeChart.last.indicators.map((i) => i.id)).toEqual(['ema', 'ema']);
    expect(names()).toEqual(['EMA 9', 'EMA 9']);
    expect(host.querySelector('.tcw-indicator-chip')).toBeNull(); // no chips crowding the toolbar
    expect(host.querySelector('[data-role="indicators"] .tcw-badge-count')?.textContent).toBe('2');
  });

  it('removes only the instance whose row was closed', async () => {
    pick('ema');
    pick('ema');
    const [first, second] = FakeChart.last.indicators.map((i) => i.instanceId);
    FakeChart.last.updateIndicator(second, { period: 50 });
    await frame();
    act(rows()[0], 'remove');
    await frame();
    expect(FakeChart.last.indicators.map((i) => i.instanceId)).toEqual([second]);
    expect(FakeChart.last.indicators.map((i) => i.instanceId)).not.toContain(first);
    expect(names()).toEqual(['EMA 50']);
  });

  it('follows indicators added or removed on the chart directly', async () => {
    const id = FakeChart.last.addIndicator('bb', { stdDev: 2.5 });
    await frame();
    expect(names()).toEqual(['BB 20 2.5']);
    FakeChart.last.removeIndicator(id);
    await frame();
    expect(names()).toEqual([]);
  });
});

describe('on-chart indicator legend', () => {
  it('stacks price-pane indicators under the OHLCV legend with their values', async () => {
    FakeChart.last.addIndicator('ema', { period: 20 });
    FakeChart.last.addIndicator('bb');
    await frame();
    const stack = host.querySelector<HTMLElement>('.tcw-ind-legend')!;
    expect(stack.style.top).toBe('41px'); // just under the OHLCV rows
    const [ema, bb] = rows();
    expect(values(ema).map((v) => v.textContent)).toEqual(['101.50']);
    expect(values(ema)[0].style.color).toBe(BLUE); // the line's colour
    expect(values(bb).map((v) => v.textContent)).toEqual(['105.00', '101.00', '97.00']);
    expect(values(bb).map((v) => v.style.color)).toEqual([BLUE, ORANGE, BLUE]); // bands, basis, bands
  });

  it('puts a pane indicator at the top of its pane', async () => {
    FakeChart.last.addIndicator('rsi');
    await frame();
    const [rsi] = rows();
    expect(rsi.classList.contains('tcw-ind-legend-row--pane')).toBe(true);
    expect([rsi.style.left, rsi.style.top]).toEqual(['4px', '307px']); // below the divider's grab zone
    expect(rsi.style.maxWidth).toBe('592px'); // stays inside its pane
    expect(values(rsi).map((v) => v.textContent)).toEqual(['54.32']);
  });

  it('reads the values at the hovered bar, and the latest bar off the chart', async () => {
    FakeChart.last.addIndicator('wma');
    await frame();
    expect(values(rows()[0]).map((v) => v.textContent)).toEqual(['9.00']);
    FakeChart.last.emit('crosshairMove', { barIndex: 3, point: { x: 10, y: 10 } });
    await frame();
    expect(values(rows()[0]).map((v) => v.textContent)).toEqual(['3.00']);
    FakeChart.last.emit('crosshairLeave', {});
    await frame();
    expect(values(rows()[0]).map((v) => v.textContent)).toEqual(['9.00']);
  });

  it('stays on the latest bar when the chart type redraws the bars', async () => {
    FakeChart.last.timeAligned = false; // Renko and the like
    FakeChart.last.addIndicator('wma');
    FakeChart.last.emit('crosshairMove', { barIndex: 3, point: { x: 10, y: 10 } });
    await frame();
    expect(values(rows()[0]).map((v) => v.textContent)).toEqual(['9.00']);
  });

  it('follows live recalculation of the indicators', async () => {
    FakeChart.last.addIndicator('wma');
    await frame();
    FakeChart.last.bump = 100;
    FakeChart.last.emit('indicatorUpdate', { from: 9 });
    await frame();
    expect(values(rows()[0]).map((v) => v.textContent)).toEqual(['109.00']);
  });

  it('leaves out flags that are not lines, and keeps the line colour', async () => {
    FakeChart.last.addIndicator('psar');
    await frame();
    const [psar] = rows();
    expect(psar.querySelector('.tcw-ind-legend-name')!.textContent).toBe('SAR 0.02 0.2');
    expect(values(psar).map((v) => v.textContent)).toEqual(['99.50']);
    expect(values(psar)[0].style.color).toBe(BLUE); // trend up: the up colour
  });

  it('colours each value as its own line, also on a warm-up bar', async () => {
    FakeChart.last.addIndicator('macd');
    FakeChart.last.emit('crosshairMove', { barIndex: 2, point: { x: 10, y: 10 } });
    await frame();
    const [macd] = rows();
    expect(values(macd).map((v) => v.textContent)).toEqual(['0.50']);
    expect(values(macd)[0].style.color).toBe(BLUE); // the MACD line, before the signal exists
    FakeChart.last.emit('crosshairLeave', {});
    await frame();
    expect(values(macd).map((v) => v.style.color)).toEqual([BLUE, ORANGE]); // MACD, signal
  });

  it('follows changes made on the chart directly', async () => {
    const id = FakeChart.last.addIndicator('ema');
    await frame();
    FakeChart.last.setIndicatorVisible(id, false); // not through the widget
    FakeChart.last.emit('indicatorChange', { instanceId: id, change: 'visible' });
    await frame();
    expect(rows()[0].classList.contains('tcw-ind-legend-row--hidden')).toBe(true);
  });

  it('names its icon buttons for assistive tech', async () => {
    FakeChart.last.addIndicator('ema');
    await frame();
    const label = (a: string) => rows()[0].querySelector(`[data-act="${a}"]`)!.getAttribute('aria-label');
    expect([label('visible'), label('settings'), label('remove')]).toEqual(['Hide EMA 9', 'Settings EMA 9', 'Remove EMA 9']);
    act(rows()[0], 'visible');
    await frame();
    expect(label('visible')).toBe('Show EMA 9');
  });

  it('hides and shows an indicator from its row', async () => {
    const id = FakeChart.last.addIndicator('ema');
    await frame();
    act(rows()[0], 'visible');
    await frame();
    expect(FakeChart.last.indicators.find((i) => i.instanceId === id)?.visible).toBe(false);
    expect(rows()[0].classList.contains('tcw-ind-legend-row--hidden')).toBe(true);
    act(rows()[0], 'visible');
    await frame();
    expect(FakeChart.last.indicators[0].visible).toBe(true);
  });

  it('collapses a stack of indicators and opens it again', async () => {
    FakeChart.last.addIndicator('ema');
    await frame();
    const toggle = host.querySelector<HTMLButtonElement>('.tcw-ind-legend-toggle')!;
    expect(toggle.hidden).toBe(true); // one indicator: nothing to collapse
    FakeChart.last.addIndicator('bb');
    await frame();
    expect(toggle.hidden).toBe(false);
    toggle.click();
    expect(host.querySelector('.tcw-ind-legend')!.classList.contains('tcw-ind-legend--collapsed')).toBe(true);
    expect(toggle.textContent).toBe('2');
    expect(toggle.getAttribute('aria-label')).toBe('Show indicators (2)');
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens a collapsed stack when another indicator joins it', async () => {
    FakeChart.last.addIndicator('ema');
    FakeChart.last.addIndicator('bb');
    await frame();
    host.querySelector<HTMLButtonElement>('.tcw-ind-legend-toggle')!.click();
    FakeChart.last.addIndicator('ema', { period: 50 });
    await frame();
    expect(host.querySelector('.tcw-ind-legend')!.classList.contains('tcw-ind-legend--collapsed')).toBe(false);
    expect(names()).toEqual(['EMA 9', 'BB 20 2', 'EMA 50']);
  });

  it('can be switched off', async () => {
    widget.destroy();
    host.replaceChildren();
    widget = new ChartWidget(host, { adapter, symbol: 'AAA', watchlist: false, indicatorLegend: false });
    FakeChart.last.addIndicator('ema');
    await frame();
    expect(getComputedStyle(host.querySelector('.tcw-ind-legend')!).display).toBe('none');
    expect(host.querySelector('.tcw-ind-legend-row')).toBeNull();
  });
});

describe('percent comparisons in the on-chart legend', () => {
  const bars = Array.from({ length: BARS }, (_, i) => ({ time: i * 3_600_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  /** A widget whose adapter has the other symbol's bars, an EMA and BBB compared on it. */
  const comparing = async () => {
    widget.destroy();
    host.replaceChildren();
    const feed = { ...adapter, fetchHistory: async () => bars, connect: () => {}, disconnect: () => {}, on: () => {}, off: () => {} };
    widget = new ChartWidget(host, { adapter: feed as unknown as DataAdapter, symbol: 'AAA', timeframe: '5m', watchlist: false });
    FakeChart.last.addIndicator('ema', { period: 20 });
    await widget.addCompareSymbol('BBB');
    await frame();
  };

  it('lists each percent comparison first, with its price and its change in its colour', async () => {
    await comparing();
    expect(names()).toEqual(['BBB', 'EMA 20']);
    const [bbb] = rows();
    expect(values(bbb).map((v) => v.textContent)).toEqual(['0.1002', '-7.69%']);
    expect(values(bbb)[0].style.color).toBe('');
    expect(values(bbb)[1].style.color).not.toBe('');
    // Not an indicator: no settings, no more.
    expect(bbb.querySelector('[data-act="settings"]')).toBeNull();
    expect(bbb.querySelector('[data-act="more"]')).toBeNull();
    expect(bbb.querySelector('.tcw-ind-legend-name')!.tagName).not.toBe('BUTTON');
  });

  it('hides a comparison, and takes it off, from its legend row', async () => {
    await comparing();
    act(rows()[0], 'visible');
    expect(FakeChart.last.compareLines[0].visible).toBe(false);
    await frame();
    expect(rows()[0].classList.contains('tcw-ind-legend-row--hidden')).toBe(true);
    act(rows()[0], 'remove');
    expect(FakeChart.last.compareLines).toEqual([]);
    await frame();
    expect(names()).toEqual(['EMA 20']);
  });

  it('reads a comparison at the bar under the cursor, and again on a pan', async () => {
    await comparing();
    FakeChart.last.emit('crosshairMove', { barIndex: 4 });
    await frame();
    expect(FakeChart.last.compareAsked.at(-1)).toBe(4);
    FakeChart.last.compareAsked = [];
    FakeChart.last.emit('visibleRangeChange', { from: 2, to: 9 });
    await frame();
    expect(FakeChart.last.compareAsked).not.toEqual([]);
    // Off the chart: the chart's own last bar, not an index into the data.
    FakeChart.last.emit('crosshairLeave', {});
    await frame();
    expect(FakeChart.last.compareAsked.at(-1)).toBeUndefined();
  });

  it('dims a comparison where the chart draws no compare lines, and says why', async () => {
    await comparing();
    FakeChart.last.timeAligned = false; // Renko, say: its bars are not the data's
    FakeChart.last.emit('crosshairMove', { barIndex: 4 });
    await frame();
    expect(FakeChart.last.compareAsked.at(-1)).toBeUndefined();
    const [bbb] = rows();
    expect(bbb.classList.contains('tcw-ind-legend-row--hidden')).toBe(true);
    expect(bbb.title).toBe('Not drawn on this chart type');
    expect(values(bbb)).toEqual([]);
    // Its eye and its remove button still work.
    act(bbb, 'remove');
    expect(FakeChart.last.compareLines).toEqual([]);
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

  it('names an indicator on another symbol after it', () => {
    expect(indicatorChipLabel('compareSymbol', { symbol: 'ETHUSDT' }, { symbol: '' }, 'Compare')).toBe('Compare ETHUSDT');
    expect(indicatorChipLabel('spread', { symbol: 'ETHUSDT', mode: 'ratio' }, { symbol: '', mode: 'spread' }, 'Spread')).toBe('Ratio ETHUSDT');
    expect(indicatorChipLabel('spread', { symbol: 'ETHUSDT', mode: 'spread' }, { symbol: '', mode: 'spread' }, 'Spread')).toBe('Spread ETHUSDT');
  });
});

describe('ChartWidget’s indicators dialog', () => {
  it('lists what can be added on its own, not Compare’s indicators', () => {
    host.querySelector<HTMLButtonElement>('[data-role="indicators"]')!.click();
    const ids = [...document.querySelectorAll<HTMLButtonElement>('.tcw-ip-add')].map((b) => b.dataset.ind);
    expect(ids).toContain('rsi');
    expect(ids).not.toContain('compareSymbol');
    expect(document.querySelector('.tcw-ip-tab[data-view="other"]')).toBeNull();
  });
});

describe('ChartWidget indicator defaults and intervals', () => {
  const menuItem = (text: string) =>
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((b) => b.textContent?.includes(text))!;

  it('starts the next one of a kind as saved with “Save as default”, here and on the next visit', async () => {
    localStorage.removeItem('tcw:indicator-defaults');
    pick('rsi');
    await frame();
    act(rows()[0], 'settings');
    const period = document.querySelector<HTMLInputElement>('.tcw-indi input[type="number"]')!;
    period.value = '21';
    period.dispatchEvent(new Event('change'));
    document.querySelector<HTMLButtonElement>('.tcw-indi [data-act="defaults"]')!.click();
    menuItem('Save as default').click();
    document.querySelector<HTMLButtonElement>('.tcw-indi [data-act="ok"]')!.click();
    expect(FakeChart.last.styleDefaults.get('rsi')).toEqual({ colors: PALETTE });
    pick('rsi');
    expect(FakeChart.last.indicators.at(-1)!.params.period).toBe(21);

    widget.destroy();
    widget = new ChartWidget(host, { adapter, symbol: 'AAA', timeframe: '5m', watchlist: false });
    expect(FakeChart.last.styleDefaults.get('rsi')).toEqual({ colors: PALETTE });
    localStorage.removeItem('tcw:indicator-defaults');
  });

  it('greys an indicator not shown on this interval, and says why', async () => {
    pick('ema');
    await frame();
    FakeChart.last.indicators[0].shown = false;
    FakeChart.last.emit('indicatorChange', { instanceId: FakeChart.last.indicators[0].instanceId, change: 'intervals' });
    await frame();
    expect(rows()[0].classList.contains('tcw-ind-legend-row--hidden')).toBe(true);
    expect(rows()[0].title).toBe('Not shown on this interval');
    expect(values(rows()[0])).toHaveLength(0);
  });
});
