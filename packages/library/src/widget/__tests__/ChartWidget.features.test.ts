// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, DataAdapter, TimeFrame } from '@tradecanvas/commons';

/**
 * Stand-in for the canvas-backed Chart (jsdom has no 2D context): it keeps
 * the options it was built with and answers the timeframe whitelist.
 */
class FakeChart {
  static last: FakeChart;
  connects: { timeframe: TimeFrame }[] = [];

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) =>
        key in target ? Reflect.get(target, key, receiver) : () => undefined,
    });
  }

  data: { time: number }[] = [];
  presets: string[] = [];
  goTos: number[] = [];

  stay: boolean[] = [];
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();

  on(event: string, cb: (e: { payload: unknown }) => void): () => void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
    return () => {};
  }
  emit(event: string, payload: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  setStayInDrawingMode(on: boolean): void { this.stay.push(on); }
  inverted: boolean[] = [];
  setInvertScale(on: boolean): void { this.inverted.push(on); }
  display: string[] = [];
  setLegend(config: { visible?: boolean }): void { this.display.push(`legend:${config.visible}`); }
  setBarCountdownVisible(on: boolean): void { this.display.push(`countdown:${on}`); }
  setIndicatorValueLabelsVisible(on: boolean): void { this.display.push(`values:${on}`); }
  timezones: unknown[] = [];
  setTimezone(tz: unknown): void { this.timezones.push(tz); }
  leftScale: boolean[] = [];
  setLeftPriceScaleVisible(on: boolean): void { this.leftScale.push(on); }
  getData(): { time: number }[] { return this.data; }
  setVisibleRangePreset(preset: string): void { this.presets.push(preset); }
  goToTime(time: number): number { this.goTos.push(time); return 0; }
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  getIndicatorStyle() { return { colors: ['#4c8dff'], lineWidths: [1.5], opacity: 1 }; }
  formatPrice(v: number): string { return v.toFixed(2); }
  getIndicatorOutput(): null { return null; }

  connect(config: { timeframe: TimeFrame }): Promise<void> {
    this.connects.push(config);
    return new Promise(() => {});
  }

  isTimeframeAllowed(tf: TimeFrame): boolean {
    const allowed = this.options.features?.timeframes ?? [];
    return allowed.length === 0 || allowed.includes(tf);
  }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

const adapter = { name: 'fake' } as unknown as DataAdapter;
let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget> | null;

const make = (options: ConstructorParameters<typeof ChartWidget>[1] = {}) => {
  widget = new ChartWidget(host, { adapter, symbol: 'AAA', watchlist: false, ...options });
  return widget;
};
const barButtons = (): string[] =>
  [...host.querySelectorAll<HTMLElement>('.tcw-toolbar-group [data-tf]')].map((b) => b.dataset.tf!);
const activeButton = (): string | undefined =>
  host.querySelector<HTMLElement>('.tcw-toolbar-group [data-tf].tcw-active')?.dataset.tf;
const menuItems = (): string[] =>
  [...host.querySelectorAll<HTMLElement>('[data-tf-pick]')].map((b) => b.dataset.tfPick!);
const star = (tf: string): HTMLButtonElement => host.querySelector(`[data-tf-star="${tf}"]`)!;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  widget = null;
});

afterEach(() => {
  widget?.destroy();
  host.remove();
});

describe('ChartWidget timeframes', () => {
  it('shows the standard favourites and lists the rest in the menu', () => {
    make({ timeframe: '5m' });
    expect(barButtons()).toEqual(['1m', '5m', '15m', '1h', '4h', '1d']);
    expect(activeButton()).toBe('5m');
    expect(menuItems()).toEqual(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1M']);
  });

  it('pins and unpins from the menu, and remembers it', () => {
    make({ timeframe: '5m' });
    star('30m').click();
    star('1m').click();
    expect(barButtons()).toEqual(['5m', '15m', '30m', '1h', '4h', '1d']);
    expect(star('30m').getAttribute('aria-pressed')).toBe('true');
    widget!.destroy();
    host.replaceChildren();

    make({ timeframe: '5m' });
    expect(barButtons()).toEqual(['5m', '15m', '30m', '1h', '4h', '1d']);
  });

  it('shows the current timeframe even when it is not pinned', () => {
    make({ timeframe: '2h' });
    expect(barButtons()).toEqual(['1m', '5m', '15m', '1h', '2h', '4h', '1d']);
    expect(activeButton()).toBe('2h');
  });

  it('starts from features.defaultTimeframeFavorites', () => {
    make({ timeframe: '1h', chartOptions: { features: { defaultTimeframeFavorites: ['1h', '1d', '1w'] } } });
    expect(barButtons()).toEqual(['1h', '1d', '1w']);
  });

  it('offers only whitelisted timeframes and starts on one of them', () => {
    make({ timeframe: '5m', chartOptions: { features: { timeframes: ['1h', '4h', '1d'] } } });
    expect(menuItems()).toEqual(['1h', '4h', '1d']);
    expect(barButtons()).toEqual(['1h', '4h', '1d']);
    expect(FakeChart.last.connects[0].timeframe).toBe('1h');

    void widget!.setTimeframe('5m');
    expect(FakeChart.last.connects).toHaveLength(1);
    expect(activeButton()).toBe('1h');
  });

  it('keeps a host-chosen list on the bar as before', () => {
    make({ timeframe: '1h', timeframes: ['1h', '1d'] });
    expect(barButtons()).toEqual(['1h', '1d']);
  });
});

describe('ChartWidget custom timeframes', () => {
  const input = () => host.querySelector<HTMLInputElement>('.tcw-tf-custom-input')!;
  const submit = (text: string) => {
    input().value = text;
    input().form!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  it('adds a typed interval, pins it and switches to it', () => {
    make({ timeframe: '5m' });
    submit('7');
    expect(menuItems()).toEqual(['1m', '3m', '5m', '7m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1M']);
    expect(barButtons()).toContain('7m');
    expect(FakeChart.last.connects.at(-1)?.timeframe).toBe('7m');
    expect(input().value).toBe('');
  });

  it('remembers custom intervals, and lets them be removed', () => {
    make({ timeframe: '5m' });
    submit('90m');
    widget!.destroy();
    host.replaceChildren();

    make({ timeframe: '5m' });
    expect(menuItems()).toContain('90m');
    host.querySelector<HTMLButtonElement>('[data-tf-remove="90m"]')!.click();
    expect(menuItems()).not.toContain('90m');
    expect(barButtons()).not.toContain('90m');
  });

  it('switches to an interval already on offer without adding it twice', () => {
    make({ timeframe: '5m' });
    submit('60');
    expect(FakeChart.last.connects.at(-1)?.timeframe).toBe('1h');
    expect(menuItems().filter((tf) => tf === '1h')).toHaveLength(1);
    expect(host.querySelector('[data-tf-remove="1h"]')).toBeNull();
  });

  it('marks text that is not an interval and keeps it for fixing', () => {
    make({ timeframe: '5m' });
    submit('abc');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().value).toBe('abc');
    const hint = host.querySelector<HTMLElement>('.tcw-tf-custom-hint')!;
    expect(input().getAttribute('aria-describedby')).toBe(hint.id);
    expect(hint.textContent).toMatch(/7m/);
    input().value = 'abcd';
    input().dispatchEvent(new Event('input'));
    expect(hint.textContent).toBe('');
    expect(FakeChart.last.connects).toHaveLength(1);
  });

  it('refuses an interval that features.timeframes leaves out', () => {
    make({ timeframe: '1h', chartOptions: { features: { timeframes: ['1h', '4h'] } } });
    submit('2h');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(menuItems()).toEqual(['1h', '4h']);
  });
});

describe('ChartWidget symbol search through the adapter', () => {
  it('searches the feed as the user types, with names', async () => {
    vi.useFakeTimers();
    try {
      const searchSymbols = vi.fn(async () => [{ symbol: 'BTCUSDT', description: 'BTC / USDT', exchange: 'Binance' }]);
      widget = new ChartWidget(host, {
        adapter: { name: 'fake', searchSymbols } as unknown as DataAdapter, symbol: 'AAA', watchlist: false,
      });
      host.querySelector<HTMLButtonElement>('[data-role="symbol"]')!.click();
      const input = document.querySelector<HTMLInputElement>('.tcw-cmd-input')!;
      input.value = 'btc';
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(200);
      expect(searchSymbols).toHaveBeenCalledWith('btc', expect.objectContaining({ limit: 50 }));
      expect(document.querySelector('.tcw-cmd-item')?.textContent).toContain('BTC / USDT');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ChartWidget leaves out switched-off features', () => {
  it('has no magnet button when the magnet is off', () => {
    make({ chartOptions: { features: { drawingMagnet: false } } });
    expect(host.querySelector('.tcw-sidebar-btn[title^="Magnet"]')).toBeNull();
  });

  it('has a magnet button by default', () => {
    make();
    expect(host.querySelector('.tcw-sidebar-btn[title^="Magnet"]')).not.toBeNull();
  });
});

describe('ChartWidget range bar', () => {
  const T_FIRST = Date.UTC(2026, 0, 1);
  const T_LAST = Date.UTC(2026, 2, 1, 12);

  it('shows the presets and passes the choice to the chart', () => {
    make();
    const labels = [...host.querySelectorAll<HTMLElement>('[data-range]')].map((b) => b.textContent);
    expect(labels).toEqual(['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All']);
    host.querySelector<HTMLButtonElement>('[data-range="3M"]')!.click();
    expect(FakeChart.last.presets).toEqual(['3M']);
  });

  it('applies the legend, countdown and indicator value toggles to the chart', () => {
    make();
    const apply = (p: object) => (widget as unknown as { applySettings(p: object): void }).applySettings(p);
    apply({ legendVisible: false });
    apply({ barCountdown: false });
    apply({ indicatorValueLabels: false });
    expect(FakeChart.last.display).toEqual(['legend:false', 'countdown:false', 'values:false']);
  });

  it('goes to the date typed in the popover, read in the display timezone', () => {
    make();
    FakeChart.last.data = [{ time: T_FIRST }, { time: T_LAST }];
    (widget as unknown as { applySettings(p: object): void }).applySettings({ timezone: '0' }); // UTC, via the settings panel's handler
    host.querySelector<HTMLButtonElement>('[data-role="goto"]')!.click();
    const [date, time] = [...host.querySelectorAll<HTMLInputElement>('.tcw-goto-input')];
    expect([date.value, time.value]).toEqual(['2026-03-01', '12:00']); // starts at the last bar
    date.value = '2026-02-10';
    time.value = '08:30';
    host.querySelector<HTMLFormElement>('form.tcw-goto')!.requestSubmit();
    expect(FakeChart.last.goTos).toEqual([Date.UTC(2026, 1, 10, 8, 30)]);
  });

  it('starts from the host’s time zone and left scale, and Reset keeps them', () => {
    make({ chartOptions: { timeZone: 'America/New_York', leftPriceScale: true } });
    const settings = () => (widget as unknown as { settingsState: { timezone: string; leftPriceScale: boolean } }).settingsState;
    expect(settings().timezone).toBe('America/New_York');
    expect(settings().leftPriceScale).toBe(true);
    (widget as unknown as { applySettings(p: object): void }).applySettings({ timezone: 'local', leftPriceScale: false });
    FakeChart.last.timezones = [];
    FakeChart.last.leftScale = [];
    (widget as unknown as { resetSettings(): void }).resetSettings();
    expect(FakeChart.last.timezones).toEqual(['America/New_York']);
    expect(FakeChart.last.leftScale).toEqual([true]);
  });

  it('reads dates in the host’s time zone from the start', () => {
    make({ chartOptions: { timeZone: 0 } });
    FakeChart.last.data = [{ time: T_LAST }];
    host.querySelector<HTMLButtonElement>('[data-role="goto"]')!.click();
    const [date, time] = [...host.querySelectorAll<HTMLInputElement>('.tcw-goto-input')];
    expect([date.value, time.value]).toEqual(['2026-03-01', '12:00']);
  });

  it('opens with Alt+G', () => {
    make();
    FakeChart.last.data = [{ time: T_LAST }];
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '©', code: 'KeyG', altKey: true }));
    expect(host.querySelector('.tcw-goto')).not.toBeNull();
  });

  it('can be left out', () => {
    make({ rangeBar: false });
    expect(host.querySelector('[data-range]')).toBeNull();
  });
});

describe('ChartWidget drawing tools', () => {
  const stayBtn = () => host.querySelector<HTMLButtonElement>('[data-role="stay"]')!;

  it('toggles stay-in-drawing mode from the sidebar', () => {
    make();
    stayBtn().click();
    expect(FakeChart.last.stay).toEqual([true]);
    expect(stayBtn().getAttribute('aria-pressed')).toBe('true');
    stayBtn().click();
    expect(FakeChart.last.stay).toEqual([true, false]);
  });

  it('follows the chart when its drawing tool ends', () => {
    make();
    const cursorActive = () =>
      host.querySelector('.tcw-sidebar-btn[title="Cursor"]')!.classList.contains('tcw-active');
    FakeChart.last.emit('drawingToolChange', { tool: 'trendLine' });
    expect(cursorActive()).toBe(false);
    FakeChart.last.emit('drawingToolChange', { tool: null });
    expect(cursorActive()).toBe(true);
  });
});

describe('ChartWidget scale and screen', () => {
  it('inverts the price scale with Alt+I, and back', () => {
    make();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ı', code: 'KeyI', altKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ı', code: 'KeyI', altKey: true }));
    expect(FakeChart.last.inverted).toEqual([true, false]);
  });

  it('has no fullscreen button where the browser does not allow it', () => {
    make();
    expect(host.querySelector('[data-role="fullscreen"]')).toBeNull();
  });

  it('fills the screen with the widget and follows the browser leaving it', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    let full: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', { get: () => full, configurable: true });
    const request = vi.fn(function (this: Element) { full = this; return Promise.resolve(); });
    HTMLElement.prototype.requestFullscreen = request;
    try {
      make();
      const btn = host.querySelector<HTMLButtonElement>('[data-role="fullscreen"]')!;
      btn.click();
      expect(request).toHaveBeenCalledTimes(1);
      expect(full).toBe(host.querySelector('.tcw-root'));
      document.dispatchEvent(new Event('fullscreenchange'));
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      full = null; // e.g. the user pressed Esc
      document.dispatchEvent(new Event('fullscreenchange'));
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    } finally {
      delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;
      delete (document as { fullscreenElement?: Element | null }).fullscreenElement;
      delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
    }
  });
});

describe('ChartWidget overlays and shortcuts', () => {
  it('opens settings in a themed portal, inside the widget while it is fullscreen', () => {
    make({ theme: 'light' });
    const root = host.querySelector('.tcw-root')!;
    host.querySelector<HTMLButtonElement>('.tcw-btn-icon[title="Chart Settings"]')!.click();
    const portal = document.querySelector('.tcw-portal')!;
    expect(portal.querySelector('.tcw-modal')).not.toBeNull();
    expect(portal.parentElement).toBe(document.body);
    expect((portal as HTMLElement).dataset.tcwTheme).toBe('light');

    let full: Element | null = root;
    Object.defineProperty(document, 'fullscreenElement', { get: () => full, configurable: true });
    try {
      document.dispatchEvent(new Event('fullscreenchange'));
      expect(portal.parentElement).toBe(root); // the open panel follows
      full = null;
      document.dispatchEvent(new Event('fullscreenchange'));
      expect(portal.parentElement).toBe(document.body);
    } finally {
      delete (document as { fullscreenElement?: Element | null }).fullscreenElement;
    }
  });

  it('sends Alt+I to the widget used last, and not while typing', () => {
    make();
    const first = FakeChart.last;
    const otherHost = document.createElement('div');
    document.body.appendChild(otherHost);
    const other = new ChartWidget(otherHost, { adapter, symbol: 'BBB', watchlist: false });
    const second = FakeChart.last;
    try {
      host.querySelector('.tcw-root')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', altKey: true }));
      expect([first.inverted, second.inverted]).toEqual([[true], []]);

      const field = document.createElement('input');
      document.body.appendChild(field);
      field.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', altKey: true }));
      field.remove();
      expect(first.inverted).toEqual([true]);
    } finally {
      other.destroy();
      otherHost.remove();
    }
  });

  it('closes the go-to popover from the button that opened it', () => {
    make();
    FakeChart.last.data = [{ time: Date.UTC(2026, 0, 1) }];
    const btn = host.querySelector<HTMLButtonElement>('[data-role="goto"]')!;
    btn.click();
    expect(host.querySelector('.tcw-goto')).not.toBeNull();
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    btn.click();
    expect(host.querySelector('.tcw-goto')).toBeNull();
  });
});
