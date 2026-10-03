import type { ChartA11yLabels } from '@tradecanvas/commons';

export type { ChartA11yLabels };

export const DEFAULT_A11Y_LABELS: ChartA11yLabels = {
  role: 'chart',
  summary: '{what}. Last price {close}.',
  empty: 'Chart, no data.',
  view: 'Showing {count} bars, {from} to {to}. High {high}, low {low}.',
  bar: '{time}: open {open}, high {high}, low {low}, close {close}, volume {volume}.',
  keys: 'Arrow keys scroll and zoom, Home and End go to the start and the end. Comma and period read the bars one at a time.',
};

/** What the chart tells its reader, asked when needed. */
export interface ChartA11ySource {
  symbol: () => string;
  timeframe: () => string;
  chartType: () => string;
  bars: () => readonly { time: number; open: number; high: number; low: number; close: number; volume?: number }[];
  visibleRange: () => { from: number; to: number };
  formatPrice: (price: number) => string;
  formatTime: (time: number) => string;
  /** Show the bar being read (a time crosshair); null clears it. */
  showBar: (time: number | null) => void;
}

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (m, name: string) => (name in values ? String(values[name]) : m));

const A11Y_ATTRIBUTES = ['role', 'aria-roledescription', 'aria-label', 'aria-describedby'] as const;

/** Wait after the last key before saying what is on screen. */
const VIEW_ANNOUNCE_MS = 400;
/** The summary follows live data at most this often. */
const SUMMARY_MS = 1000;

/**
 * The chart for screen readers: the container is an application with a
 * summary (symbol, type, timeframe, last price) and key help; after the keys
 * move the view it says what is on screen, and comma and period read the
 * bars one at a time.
 */
export class ChartA11y {
  private readonly live: HTMLDivElement;
  private readonly help: HTMLDivElement;
  private labels: ChartA11yLabels;
  private cursor: number | null = null;
  private viewTimer: ReturnType<typeof setTimeout> | null = null;
  /** The container's own attributes before, put back on destroy. */
  private readonly before = new Map<string, string | null>();
  private summaryAt = 0;
  private summaryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onBlur = () => {
    this.cursor = null;
    this.source.showBar(null);
  };

  constructor(
    private readonly container: HTMLElement,
    private readonly source: ChartA11ySource,
    labels: Partial<ChartA11yLabels> = {},
  ) {
    this.labels = { ...DEFAULT_A11Y_LABELS, ...labels };
    for (const attr of A11Y_ATTRIBUTES) this.before.set(attr, container.getAttribute(attr));
    container.setAttribute('role', 'application');

    this.help = hidden('div', 'tc-sr-only');
    this.help.id = `tc-chart-keys-${Math.random().toString(36).slice(2, 10)}`;
    container.setAttribute('aria-describedby', this.help.id);

    this.live = hidden('div', 'tc-sr-only tc-sr-live');
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');

    container.append(this.help, this.live);
    container.addEventListener('blur', this.onBlur);
    this.applyLabels();
  }

  setLabels(labels: Partial<ChartA11yLabels>): void {
    this.labels = { ...DEFAULT_A11Y_LABELS, ...labels };
    this.applyLabels();
  }

  /** The summary again (new data, type, symbol): at once, or soon after when live data streams. */
  refresh(force = false): void {
    const wait = SUMMARY_MS - (Date.now() - this.summaryAt);
    // The first bars are told at once; a stream's ticks at most once a second.
    if (force || wait <= 0 || this.container.getAttribute('aria-label') === this.labels.empty) {
      if (this.summaryTimer) clearTimeout(this.summaryTimer);
      this.summaryTimer = null;
      this.summaryAt = Date.now();
      this.container.setAttribute('aria-label', this.summary());
      return;
    }
    this.summaryTimer ??= setTimeout(() => {
      this.summaryTimer = null;
      this.refresh(true);
    }, wait);
  }

  /** The keys moved the view: soon, say what is on screen. */
  viewMoved(): void {
    this.cursor = null;
    if (this.viewTimer) clearTimeout(this.viewTimer);
    this.viewTimer = setTimeout(() => {
      this.viewTimer = null;
      this.say(this.viewText());
    }, VIEW_ANNOUNCE_MS);
  }

  /** Read the next (1) or previous (-1) bar; the first read starts at the last bar on screen. */
  readBar(step: 1 | -1): void {
    const bars = this.source.bars();
    if (bars.length === 0) {
      this.say(this.labels.empty);
      return;
    }
    const { to } = this.source.visibleRange();
    const start = Math.max(0, Math.min(bars.length - 1, Math.floor(to)));
    this.cursor = this.cursor === null ? start : Math.max(0, Math.min(bars.length - 1, this.cursor + step));
    const bar = bars[this.cursor];
    this.source.showBar(bar.time);
    const p = this.source.formatPrice;
    this.say(fill(this.labels.bar, {
      time: this.source.formatTime(bar.time),
      open: p(bar.open),
      high: p(bar.high),
      low: p(bar.low),
      close: p(bar.close),
      volume: formatVolume(bar.volume ?? 0),
    }));
  }

  destroy(): void {
    if (this.viewTimer) clearTimeout(this.viewTimer);
    if (this.summaryTimer) clearTimeout(this.summaryTimer);
    this.container.removeEventListener('blur', this.onBlur);
    for (const [attr, value] of this.before) {
      if (value === null) this.container.removeAttribute(attr);
      else this.container.setAttribute(attr, value);
    }
    this.help.remove();
    this.live.remove();
  }

  private applyLabels(): void {
    this.container.setAttribute('aria-roledescription', this.labels.role);
    this.help.textContent = this.labels.keys;
    this.refresh(true);
  }

  private summary(): string {
    const bars = this.source.bars();
    if (bars.length === 0) return this.labels.empty;
    const type = this.source.chartType();
    const what = [this.source.symbol(), this.labels.typeName ? this.labels.typeName(type) : type, this.source.timeframe()]
      .filter(Boolean)
      .join(', ');
    return fill(this.labels.summary, { what, close: this.source.formatPrice(bars[bars.length - 1].close) });
  }

  private viewText(): string {
    const bars = this.source.bars();
    if (bars.length === 0) return this.labels.empty;
    const range = this.source.visibleRange();
    const from = Math.max(0, Math.min(bars.length - 1, Math.ceil(range.from)));
    const to = Math.max(from, Math.min(bars.length - 1, Math.floor(range.to)));
    let high = -Infinity;
    let low = Infinity;
    for (let i = from; i <= to; i++) {
      high = Math.max(high, bars[i].high);
      low = Math.min(low, bars[i].low);
    }
    return fill(this.labels.view, {
      count: to - from + 1,
      from: this.source.formatTime(bars[from].time),
      to: this.source.formatTime(bars[to].time),
      high: this.source.formatPrice(high),
      low: this.source.formatPrice(low),
    });
  }

  private say(text: string): void {
    this.live.textContent = text;
  }
}

/** An element screen readers read and the eye doesn't see. */
function hidden<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  Object.assign(el.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
  return el;
}

function formatVolume(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
