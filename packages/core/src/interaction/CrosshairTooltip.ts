import type { OHLCBar, Theme, Point, TimeFormatter, TimeZoneSetting } from '@tradecanvas/commons';
import { autoPricePrecision, formatPrice, normalizeBarTime, timeParts, isDateOnly, zonedDateFormatter } from '@tradecanvas/commons';

/** Gap between the pointer and the card. */
const POINTER_GAP = 16;
/** Without a plot rect, room kept clear for the price axis when picking a side. */
const AXIS_ROOM = 80;
const DAY_MS = 86_400_000;

/** Per-show context the chart knows and the bar alone does not. */
export interface CrosshairTooltipContext {
  /** Previous bar's close: the change is measured from it, like the legend. */
  prevClose?: number;
  /** Visible price range, for picking decimals when no precision is set. */
  priceRange?: { min: number; max: number };
  /** The plot area: the card stays inside it and flips before the price axis. */
  plot?: { x: number; y: number; width: number; height: number };
  /** Spacing of the bars in ms: daily-or-larger shows a date, sub-minute adds seconds. */
  barStepMs?: number;
}

const MONTH_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const MONTH_DAY_YEAR: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

/** "Mar 4" / "Mar 4, 2026" in `locale`, for the wall-clock date of `ms` in `tz`. */
function formatDate(ms: number, tz: TimeZoneSetting, locale: string, withYear: boolean): string {
  return zonedDateFormatter(locale, withYear ? MONTH_DAY_YEAR : MONTH_DAY, tz)(ms);
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * The bar's time as the card shows it, in the chart's timezone and locale:
 * "Mar 4, 2026" for daily-or-larger bars, "Mar 4 · 14:05" for intraday ones
 * and "Mar 4 · 14:05:30" for sub-minute ones ("4 thg 3 · 14:05" in vi-VN).
 * Pass the bar spacing in ms when known: without it, a midnight bar can't be
 * told from a daily one.
 */
export function formatTooltipTime(
  rawTime: number,
  tz: TimeZoneSetting,
  barStepMs?: number,
  locale = 'en-US',
): string {
  const ms = normalizeBarTime(rawTime);
  const parts = timeParts(ms, tz);
  const daily = barStepMs !== undefined && barStepMs > 0 ? barStepMs >= DAY_MS : isDateOnly(parts);
  if (daily) return formatDate(ms, tz, locale, true);
  const date = formatDate(ms, tz, locale, false);
  const clock = `${pad2(parts.hours)}:${pad2(parts.minutes)}`;
  if (barStepMs !== undefined && barStepMs > 0 && barStepMs < 60_000) {
    // Timezone offsets are whole minutes: the seconds are the same everywhere.
    return `${date} · ${clock}:${pad2(new Date(ms).getUTCSeconds())}`;
  }
  return `${date} · ${clock}`;
}

function formatVolume(v: number, locale: string): string {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e9) return `${formatPrice(v / 1e9, 2, locale)}B`;
  if (v >= 1e6) return `${formatPrice(v / 1e6, 2, locale)}M`;
  if (v >= 1e3) return `${formatPrice(v / 1e3, 1, locale)}K`;
  return formatPrice(v, v % 1 === 0 ? 0 : 2, locale);
}

/**
 * Floating OHLCV card that follows the crosshair.
 *
 * The DOM is built once; a hover only rewrites text, and colours are applied
 * again only when the theme changes. It is positioned with a transform so a
 * move never triggers layout.
 */
export class CrosshairTooltip {
  private el: HTMLElement | null = null;
  private visible = false;
  private appliedTheme: Theme | null = null;

  private locale = 'en-US';
  private pricePrecision: number | null = null;
  private tz: TimeZoneSetting = null;
  private priceFormatter: ((price: number) => string) | null = null;
  private timeFormatter: TimeFormatter | null = null;

  // Pre-built nodes, updated through textContent.
  private dirEl!: HTMLElement;
  private timeEl!: HTMLElement;
  private changeEl!: HTMLElement;
  private valueEls!: { open: HTMLElement; high: HTMLElement; low: HTMLElement; close: HTMLElement; volume: HTMLElement };
  private labelEls: HTMLElement[] = [];
  private dividerEl!: HTMLElement;

  private width = 176;
  private height = 112;

  create(container: HTMLElement): void {
    if (this.el) return;
    const el = document.createElement('div');
    // Pointer-only: it follows the mouse and isn't announced.
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      display: 'none',
      minWidth: '168px',
      padding: '8px 10px 9px',
      borderRadius: '8px',
      fontSize: '11.5px',
      lineHeight: '1.45',
      fontVariantNumeric: 'tabular-nums',
      pointerEvents: 'none',
      zIndex: '100',
      whiteSpace: 'nowrap',
      willChange: 'transform',
      contain: 'layout paint',
      backdropFilter: 'blur(10px)',
    } satisfies Partial<CSSStyleDeclaration>);

    // Header: direction tick, time, change pill.
    const header = div({ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' });
    this.dirEl = div({ width: '3px', height: '12px', borderRadius: '2px', flex: 'none' });
    this.timeEl = div({ flex: '1', fontSize: '11px', letterSpacing: '0.01em' });
    this.changeEl = div({ padding: '1px 6px', borderRadius: '999px', fontSize: '10.5px', fontWeight: '600' });
    header.append(this.dirEl, this.timeEl, this.changeEl);

    // O / H / L / C grid, labels muted, values aligned.
    const grid = div({ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', columnGap: '8px', rowGap: '1px', alignItems: 'baseline' });
    const cell = (label: string): HTMLElement => {
      const l = div({ fontSize: '10px', letterSpacing: '0.04em' });
      l.textContent = label;
      this.labelEls.push(l);
      const v = div({ textAlign: 'right', fontWeight: '500' });
      grid.append(l, v);
      return v;
    };
    const open = cell('O');
    const high = cell('H');
    const low = cell('L');
    const close = cell('C');

    this.dividerEl = div({ height: '1px', margin: '6px 0 5px' });
    const footer = div({ display: 'flex', justifyContent: 'space-between', gap: '12px' });
    const volLabel = div({ fontSize: '10px', letterSpacing: '0.04em' });
    volLabel.textContent = 'VOL';
    this.labelEls.push(volLabel);
    const volume = div({ fontWeight: '500' });
    footer.append(volLabel, volume);

    this.valueEls = { open, high, low, close, volume };
    el.append(header, grid, this.dividerEl, footer);
    container.appendChild(el);
    this.el = el;
  }

  /** Locale for number formatting (BCP 47). */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  /** Fixed decimals (a market's precision); `null` picks them from the visible range. */
  setPricePrecision(precision: number | null): void {
    this.pricePrecision = precision;
  }

  /** Timezone for the time line: an IANA zone, a UTC offset in minutes, or `null` for the browser's. */
  setTimezoneOffset(tz: TimeZoneSetting): void {
    this.tz = tz;
  }

  /** Prices in the chart's format (null: decimals). */
  setPriceFormatter(formatter: ((price: number) => string) | null): void {
    this.priceFormatter = formatter;
  }

  /** The time line in your words (null: its own). */
  setTimeFormatter(formatter: TimeFormatter | null): void {
    this.timeFormatter = formatter;
  }

  show(
    pos: Point,
    bar: OHLCBar,
    theme: Theme,
    containerRect: { width: number; height: number },
    context: CrosshairTooltipContext = {},
  ): void {
    const el = this.el;
    if (!el) return;
    if (this.appliedTheme !== theme) this.applyTheme(theme);

    const precision = this.pricePrecision
      ?? (context.priceRange ? autoPricePrecision(context.priceRange.min, context.priceRange.max) : autoPricePrecision(bar.low, bar.high));
    const fmt = (v: number) => this.priceFormatter?.(v) ?? formatPrice(v, precision, this.locale);

    const base = context.prevClose ?? bar.open;
    const change = bar.close - base;
    const pct = base !== 0 ? (change / base) * 100 : 0;
    const up = change >= 0;
    const tone = up ? theme.candleUp : theme.candleDown;
    const sign = up ? '+' : '−';

    this.timeEl.textContent = this.timeFormatter
      ? this.timeFormatter(normalizeBarTime(bar.time), { kind: 'crosshair', timeZone: this.tz })
      : formatTooltipTime(bar.time, this.tz, context.barStepMs, this.locale);
    this.changeEl.textContent = `${sign}${formatPrice(Math.abs(pct), 2, this.locale)}%`;
    this.changeEl.style.color = tone;
    this.changeEl.style.background = withAlpha(tone, 0.14);
    this.dirEl.style.background = bar.close >= bar.open ? theme.candleUp : theme.candleDown;

    this.valueEls.open.textContent = fmt(bar.open);
    this.valueEls.high.textContent = fmt(bar.high);
    this.valueEls.low.textContent = fmt(bar.low);
    this.valueEls.close.textContent = fmt(bar.close);
    this.valueEls.close.style.color = bar.close >= bar.open ? theme.candleUp : theme.candleDown;
    this.valueEls.volume.textContent = formatVolume(bar.volume, this.locale);

    if (!this.visible) {
      el.style.display = 'block';
      this.visible = true;
    }
    // Shown once per bar change, not per mouse move: measuring here is cheap
    // and keeps the card on screen as its width follows the digits.
    this.width = el.offsetWidth || this.width;
    this.height = el.offsetHeight || this.height;

    // Keep the card inside the plot (or the container, less the axis room).
    const area = context.plot ?? { x: 0, y: 0, width: containerRect.width - AXIS_ROOM, height: containerRect.height };
    const right = area.x + area.width;
    const bottom = area.y + area.height;
    let x = pos.x + POINTER_GAP;
    let y = pos.y - this.height / 2;
    if (x + this.width > right - 4) x = pos.x - this.width - POINTER_GAP;
    if (x < area.x + 4) x = area.x + 4;
    if (y + this.height > bottom - 4) y = bottom - this.height - 4;
    if (y < area.y + 4) y = area.y + 4;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  hide(): void {
    if (this.el && this.visible) {
      this.el.style.display = 'none';
      this.visible = false;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.el?.remove();
    this.el = null;
    this.visible = false;
    this.appliedTheme = null;
    this.labelEls = [];
  }

  private applyTheme(theme: Theme): void {
    const el = this.el!;
    const dark = isDarkColor(theme.background);
    el.style.background = withAlpha(theme.background, dark ? 0.9 : 0.94);
    el.style.border = `1px solid ${theme.axisLine}`;
    el.style.boxShadow = dark
      ? '0 12px 32px -8px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.35)'
      : '0 12px 32px -10px rgba(15, 19, 26, 0.22), 0 2px 6px rgba(15, 19, 26, 0.08)';
    el.style.color = theme.text;
    el.style.fontFamily = theme.font.family;
    this.timeEl.style.color = theme.textSecondary;
    for (const label of this.labelEls) label.style.color = theme.textSecondary;
    this.dividerEl.style.background = theme.axisLine;
    this.appliedTheme = theme;
  }
}

function div(style: Partial<CSSStyleDeclaration>): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, style);
  return el;
}

/** Whether a hex/rgb colour is dark (luma < 0.5). */
function isDarkColor(color: string): boolean {
  const rgb = parseRgb(color);
  if (!rgb) return true;
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 < 0.5;
}

function parseRgb(color: string): [number, number, number] | null {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  }
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** The colour at `alpha`; colours this can't parse (hsl, oklch…) go through color-mix. */
function withAlpha(color: string, alpha: number): string {
  const rgb = parseRgb(color);
  if (rgb) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}
