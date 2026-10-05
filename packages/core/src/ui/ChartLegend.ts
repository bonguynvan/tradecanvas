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
}

export const DEFAULT_LEGEND_CONFIG: LegendConfig = {
  visible: true,
  showSymbol: true,
  showOHLC: true,
  showChange: true,
  showVolume: true,
  position: 'top-left',
  fontSize: 12,
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
  private indicators: { name: string; color: string; value: string }[] = [];
  private statusText: string | null = null;
  private locale = 'en-US';
  private pricePrecision: number | null = null;

  setConfig(config: Partial<LegendConfig>): void {
    Object.assign(this.config, config);
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
    this.symbol = symbol;
  }

  setTimeframe(tf: string): void {
    this.timeframe = tf;
  }

  setChartType(_type: string): void {
    // reserved for future use
  }

  setHoverBar(bar: OHLCBar | null): void {
    this.hoverBar = bar;
  }

  setIndicatorValues(values: { name: string; color: string; value: string }[]): void {
    this.indicators = values;
  }

  setStatusText(text: string | null): void {
    this.statusText = text;
  }

  /**
   * How far below the plot's top edge the symbol, OHLC and volume rows reach
   * (the indicator row excluded), so other content can stack under them.
   * 0 when hidden or drawn in the top-right corner.
   */
  getHeight(): number {
    if (!this.config.visible || this.config.position !== 'top-left') return 0;
    const fs = this.config.fontSize;
    let h = 6;
    if (this.config.showSymbol) h += fs + 6;
    else if (this.statusText) h += fs + 4;
    if (this.config.showOHLC) h += fs + 3;
    if (this.config.showVolume) h += fs + 2;
    return h;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries): void {
    if (!this.config.visible || data.length === 0) return;

    const bar = this.hoverBar ?? data[data.length - 1];
    const prevBar = data.length > 1 ? data[data.length - 2] : bar;
    const { chartRect } = viewport;
    const fs = this.config.fontSize;
    // Values in the legend's text colour, their labels in its label colour.
    const text = theme.style?.legend.text ?? theme.text;
    const label = theme.style?.legend.label ?? theme.textSecondary;
    const isLeft = this.config.position === 'top-left';

    let x = isLeft ? chartRect.x + 8 : chartRect.x + chartRect.width - 8;
    let y = chartRect.y + 6;

    ctx.textAlign = isLeft ? 'left' : 'right';
    ctx.textBaseline = 'top';

    // Symbol + timeframe + chart type + status text
    if (this.config.showSymbol) {
      ctx.font = `bold ${fs + 2}px ${theme.font.family}`;
      ctx.fillStyle = text;
      const symbolText = [this.symbol, this.timeframe].filter(Boolean).join(' · ');
      const displayText = this.statusText ? `${symbolText}  ${this.statusText}` : symbolText;
      ctx.fillText(displayText, x, y);
      y += fs + 6;
    } else if (this.statusText) {
      ctx.font = `${fs}px ${theme.font.family}`;
      ctx.fillStyle = label;
      ctx.fillText(this.statusText, x, y);
      y += fs + 4;
    }

    // OHLC values
    if (this.config.showOHLC) {
      ctx.font = `${fs}px ${theme.font.family}`;
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

      // Render inline
      let cx = x;
      if (isLeft) {
        for (const item of items) {
          if (item.label) {
            ctx.fillStyle = label;
            ctx.fillText(item.label, cx, y);
            cx += ctx.measureText(item.label + ' ').width;
          }
          ctx.fillStyle = item.color;
          ctx.fillText(item.value, cx, y);
          cx += ctx.measureText(item.value + '  ').width;
        }
      } else {
        // Right-aligned: build full string and measure
        const fullText = items.map((i) => `${i.label} ${i.value}`).join('  ');
        ctx.fillStyle = text;
        ctx.fillText(fullText, x, y);
      }
      y += fs + 3;
    }

    // Volume
    if (this.config.showVolume) {
      ctx.font = `${fs - 1}px ${theme.font.family}`;
      ctx.fillStyle = label;
      const vol = bar.volume >= 1e6 ? `${(bar.volume / 1e6).toFixed(2)}M` : bar.volume >= 1e3 ? `${(bar.volume / 1e3).toFixed(2)}K` : bar.volume.toFixed(0);
      ctx.fillText(`Vol ${vol}`, x, y);
      y += fs + 2;
    }

    // Active indicator values
    if (this.indicators.length > 0) {
      ctx.font = `${fs - 1}px ${theme.font.family}`;
      let ix = x;
      for (const ind of this.indicators) {
        ctx.fillStyle = ind.color;
        const entry = `${ind.name} ${ind.value}`;
        ctx.fillText(entry, ix, y);
        ix += ctx.measureText(entry + '  ').width;
      }
    }
  }
}
