import type { ViewportState, Theme, OHLCBar, DataSeries } from '@tradecanvas/commons';
import { autoPricePrecision, formatPrice } from '@tradecanvas/commons';

export interface LegendConfig {
  visible: boolean;
  showSymbol: boolean;
  showOHLC: boolean;
  showChange: boolean;
  showVolume: boolean;
  position: 'top-left' | 'top-right';
  fontSize: number;
  /** The legend's font family; null follows the theme's (`theme.font.family`). */
  fontFamily: string | null;
}

export const DEFAULT_LEGEND_CONFIG: LegendConfig = {
  visible: true,
  showSymbol: true,
  showOHLC: true,
  showChange: true,
  showVolume: true,
  position: 'top-left',
  fontSize: 12,
  fontFamily: null,
};

/**
 * Renders an OHLCV legend overlay in the chart's top-left corner.
 * Shows: Symbol, O, H, L, C, Change%, Volume
 * Updates on crosshair hover or shows last bar by default.
 */
export class ChartLegend {
  private config: LegendConfig = { ...DEFAULT_LEGEND_CONFIG };
  private symbol = '';
  private timeframe = '';
  private hoverBar: OHLCBar | null = null;
  /** The bar before the hovered one, its change measured from; null for the first bar. */
  private hoverPrev: OHLCBar | null = null;
  private indicators: { name: string; color: string; value: string }[] = [];
  private statusText: string | null = null;
  private exchange = '';
  /** The height the top rows took on the last draw; null before the first. */
  private drawnHeight: number | null = null;
  /** How far right of the plot's edge the top rows reached on the last draw (px). */
  private drawnWidth = 0;
  private locale = 'en-US';
  private pricePrecision: number | null = null;
  /** The height last told to the resize listener; null before the first draw. */
  private reportedHeight: number | null = null;
  private resizeListener: (() => void) | null = null;

  /**
   * Called after a draw that left the top rows taller or shorter than the
   * one before (a line wrapped, a status came): what stacks under them moves.
   */
  setResizeListener(listener: (() => void) | null): void {
    this.resizeListener = listener;
  }

  /**
   * What it shows changed: until the next draw its height is a guess
   * (`getHeight`), which a host may place its rows by, so that draw reports
   * the height it finds even when it is the one it had.
   */
  private forgetHeight(): void {
    this.drawnHeight = null;
    this.reportedHeight = null;
  }

  private reportResize(): void {
    const height = this.getHeight();
    if (height === this.reportedHeight) return;
    this.reportedHeight = height;
    this.resizeListener?.();
  }

  setConfig(config: Partial<LegendConfig>): void {
    Object.assign(this.config, config);
    this.forgetHeight();
  }

  /** A copy of what it shows and how. */
  getConfig(): LegendConfig {
    return { ...this.config };
  }

  /**
   * Fixed decimals for OHLC values (e.g. a market's `pricePrecision`); `null`
   * follows the price axis.
   */
  setPricePrecision(precision: number | null): void {
    this.pricePrecision = precision;
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  setSymbol(symbol: string): void {
    if (symbol === this.symbol) return;
    this.symbol = symbol;
    this.forgetHeight();
  }

  setTimeframe(tf: string): void {
    if (tf === this.timeframe) return;
    this.timeframe = tf;
    this.forgetHeight();
  }

  setChartType(_type: string): void {
    // reserved for future use
  }

  /** The bar under the pointer and the one before it (null for the first); null for none. */
  setHoverBar(bar: OHLCBar | null, prev: OHLCBar | null = null): void {
    this.hoverBar = bar;
    this.hoverPrev = bar ? prev : null;
  }

  setIndicatorValues(values: { name: string; color: string; value: string }[]): void {
    this.indicators = values;
  }

  setStatusText(text: string | null): void {
    if (text === this.statusText) return;
    this.statusText = text;
    this.forgetHeight();
  }

  /** The exchange the symbol trades on, named in the title line. */
  setExchange(exchange: string): void {
    if (exchange === this.exchange) return;
    this.exchange = exchange;
    this.forgetHeight();
  }

  /** Symbol · interval · exchange, as far as they are known ('' with none or `showSymbol` off). */
  private title(): string {
    if (!this.config.showSymbol) return '';
    return [this.symbol, this.timeframe, this.exchange].filter(Boolean).join(' · ');
  }

  private titleCells(ctx: CanvasRenderingContext2D, fs: number, family: string, text: string, label: string): LegendCell[] {
    const cells: LegendCell[] = [];
    const title = this.title();
    if (title) {
      const font = `600 ${fs}px ${family}`;
      ctx.font = font;
      cells.push({ label: '', labelWidth: 0, value: title, width: ctx.measureText(title).width, color: text, font });
    }
    if (this.statusText) {
      const font = `${fs}px ${family}`;
      ctx.font = font;
      cells.push({ label: '', labelWidth: 0, value: this.statusText, width: ctx.measureText(this.statusText).width, color: label, font });
    }
    return cells;
  }

  /**
   * O, H, L, C and the change, each value in a slot as wide as it would be
   * in zeros (and in either sign), so with a proportional font nothing
   * shifts as digits change.
   */
  private priceCells(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    bar: OHLCBar,
    prevBar: OHLCBar,
    fs: number,
    family: string,
    text: string,
  ): LegendCell[] {
    const font = `${fs}px ${family}`;
    ctx.font = font;
    const isUp = bar.close >= bar.open;
    // A market's explicit precision wins; otherwise match the price axis so
    // sub-$1 assets (e.g. ~$0.34, or PEPE at 0.0000043) don't round to 0.00.
    const precision = this.pricePrecision
      ?? autoPricePrecision(viewport.priceRange.min, viewport.priceRange.max);
    const fmt = (v: number) => viewport.formatPrice?.(v) ?? formatPrice(v, precision, this.locale);

    const items = [
      { label: 'O', value: fmt(bar.open), color: text },
      { label: 'H', value: fmt(bar.high), color: text },
      { label: 'L', value: fmt(bar.low), color: text },
      { label: 'C', value: fmt(bar.close), color: isUp ? theme.candleUp : theme.candleDown },
    ];

    if (this.config.showChange) {
      const change = bar.close - prevBar.close;
      const changePct = prevBar.close !== 0 ? (change / prevBar.close) * 100 : 0;
      const sign = change >= 0 ? '+' : '';
      const pctText = formatPrice(changePct, 2, this.locale);
      items.push({
        label: '',
        value: `${sign}${fmt(change)} (${sign}${pctText}%)`,
        color: change >= 0 ? theme.candleUp : theme.candleDown,
      });
    }

    return items.map((item) => ({
      ...item,
      labelWidth: item.label ? ctx.measureText(item.label + ' ').width : 0,
      width: valueSlot(ctx, item.value),
      font,
    }));
  }

  /**
   * How far below the plot's top edge the title, price and volume rows reach
   * (the indicator row excluded), so other content can stack under them: as
   * last drawn, wrapped lines included. 0 when hidden or drawn in the
   * top-right corner.
   */
  getHeight(): number {
    if (!this.config.visible || this.config.position !== 'top-left') return 0;
    if (this.drawnHeight !== null) return this.drawnHeight;
    const fs = this.config.fontSize;
    let h = LEGEND_TOP;
    if (this.config.showOHLC || this.title() || this.statusText) h += fs + LINE_GAP;
    if (this.config.showVolume) h += fs + 2;
    return h;
  }

  /**
   * How far right of the plot's left edge the title, price and volume rows
   * reached on the last draw, its inset included: with `getHeight()`, the
   * box drawing labels keep clear of. 0 before a draw, when hidden or drawn
   * in the top-right corner.
   */
  getWidth(): number {
    if (!this.config.visible || this.config.position !== 'top-left') return 0;
    return this.drawnWidth;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries): void {
    if (!this.config.visible || data.length === 0) return;

    const bar = this.hoverBar ?? data[data.length - 1];
    // The change is from the bar before the one shown, hovered or last.
    const prevBar = this.hoverBar
      ? this.hoverPrev ?? bar
      : data.length > 1 ? data[data.length - 2] : bar;
    const { chartRect } = viewport;
    const fs = this.config.fontSize;
    const family = this.config.fontFamily ?? theme.font.family;
    // Values in the legend's text colour, their labels in its label colour.
    const text = theme.style?.legend.text ?? theme.text;
    const label = theme.style?.legend.label ?? theme.textSecondary;
    const isLeft = this.config.position === 'top-left';

    const x = isLeft ? chartRect.x + LEGEND_INSET : chartRect.x + chartRect.width - LEGEND_INSET;
    let y = chartRect.y + LEGEND_TOP;

    ctx.textAlign = isLeft ? 'left' : 'right';
    ctx.textBaseline = 'top';
    let widest = 0;

    // The title (symbol · interval · exchange, and a status) and the prices,
    // one line that wraps where the plot is too narrow for it.
    const cells = this.titleCells(ctx, fs, family, text, label);
    if (this.config.showOHLC) cells.push(...this.priceCells(ctx, viewport, theme, bar, prevBar, fs, family, text));
    if (cells.length > 0) {
      ctx.font = `${fs}px ${family}`;
      const gap = ctx.measureText('  ').width;
      for (const line of wrapCells(cells, gap, chartRect.width - 2 * LEGEND_INSET)) {
        const total = line.reduce((sum, c) => sum + c.labelWidth + c.width + gap, -gap);
        widest = Math.max(widest, total);
        let cx = isLeft ? x : x - total;
        ctx.textAlign = 'left';
        for (const cell of line) {
          ctx.font = cell.font;
          if (cell.label) {
            ctx.fillStyle = label;
            ctx.fillText(cell.label, cx, y);
            cx += cell.labelWidth;
          }
          ctx.fillStyle = cell.color;
          ctx.fillText(cell.value, cx, y);
          cx += cell.width + gap;
        }
        y += fs + LINE_GAP;
      }
      ctx.textAlign = isLeft ? 'left' : 'right';
    }

    // Volume
    if (this.config.showVolume) {
      ctx.font = `${fs}px ${family}`;
      ctx.fillStyle = label;
      const vol = bar.volume >= 1e6 ? `${(bar.volume / 1e6).toFixed(2)}M` : bar.volume >= 1e3 ? `${(bar.volume / 1e3).toFixed(2)}K` : bar.volume.toFixed(0);
      ctx.fillText(`Vol ${vol}`, x, y);
      widest = Math.max(widest, ctx.measureText(`Vol ${vol}`).width);
      y += fs + 2;
    }
    this.drawnHeight = isLeft ? y - chartRect.y : null;
    this.drawnWidth = isLeft ? LEGEND_INSET + widest : 0;
    this.reportResize();

    // Active indicator values
    if (this.indicators.length > 0) {
      ctx.font = `${fs}px ${family}`;
      const gap = ctx.measureText('  ').width;
      const entries = this.indicators.map((ind) => {
        const entry = `${ind.name} ${ind.value}`;
        return { entry, color: ind.color, width: valueSlot(ctx, entry) };
      });
      const total = entries.reduce((sum, e) => sum + e.width + gap, -gap);
      let ix = isLeft ? x : x - total;
      ctx.textAlign = 'left';
      for (const { entry, color, width } of entries) {
        ctx.fillStyle = color;
        ctx.fillText(entry, ix, y);
        ix += width + gap;
      }
    }
  }
}

/** One item on the legend's top line: a label (O, H…) and its value, with their widths. */
interface LegendCell {
  label: string;
  labelWidth: number;
  value: string;
  width: number;
  color: string;
  font: string;
}

/** Room above the legend's first line, and to the plot's side edge (px). */
const LEGEND_TOP = 6;
const LEGEND_INSET = 8;
/** Space under each of its lines (px). */
const LINE_GAP = 3;

/** `cells` in lines no wider than `width`, a cell that can't fit on a line of its own going on one anyway. */
function wrapCells(cells: readonly LegendCell[], gap: number, width: number): LegendCell[][] {
  const lines: LegendCell[][] = [];
  let line: LegendCell[] = [];
  let used = 0;
  for (const cell of cells) {
    const w = cell.labelWidth + cell.width;
    if (line.length > 0 && used + gap + w > width) {
      lines.push(line);
      line = [];
      used = 0;
    }
    used += (line.length > 0 ? gap : 0) + w;
    line.push(cell);
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

/**
 * The width `value` takes in the legend: its widest form with every digit a
 * zero and either sign, so a ticking value keeps its place.
 */
function valueSlot(ctx: CanvasRenderingContext2D, value: string): number {
  const zeros = value.replace(/\d/g, '0');
  return Math.max(
    ctx.measureText(value).width,
    ctx.measureText(zeros.replace(/[-−]/g, '+')).width,
    ctx.measureText(zeros.replace(/\+/g, '-')).width,
  );
}
