import type { ViewportState, Theme, OHLCBar, DataSeries } from '@chart-lib/commons';

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
 * Renders an OHLCV legend overlay on the chart (like TradingView top-left).
 * Shows: Symbol, O, H, L, C, Change%, Volume
 * Updates on crosshair hover or shows last bar by default.
 */
export class ChartLegend {
  private config: LegendConfig = { ...DEFAULT_LEGEND_CONFIG };
  private symbol = '';
  private timeframe = '';
  private chartType = '';
  private hoverBar: OHLCBar | null = null;
  private indicators: { name: string; color: string; value: string }[] = [];

  setConfig(config: Partial<LegendConfig>): void {
    Object.assign(this.config, config);
  }

  setSymbol(symbol: string): void {
    this.symbol = symbol;
  }

  setTimeframe(tf: string): void {
    this.timeframe = tf;
  }

  setChartType(type: string): void {
    this.chartType = type;
  }

  setHoverBar(bar: OHLCBar | null): void {
    this.hoverBar = bar;
  }

  setIndicatorValues(values: { name: string; color: string; value: string }[]): void {
    this.indicators = values;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries): void {
    if (!this.config.visible || data.length === 0) return;

    const bar = this.hoverBar ?? data[data.length - 1];
    const prevBar = data.length > 1 ? data[data.length - 2] : bar;
    const { chartRect } = viewport;
    const fs = this.config.fontSize;
    const isLeft = this.config.position === 'top-left';

    let x = isLeft ? chartRect.x + 8 : chartRect.x + chartRect.width - 8;
    let y = chartRect.y + 6;

    ctx.textAlign = isLeft ? 'left' : 'right';
    ctx.textBaseline = 'top';

    // Symbol + timeframe + chart type
    if (this.config.showSymbol) {
      ctx.font = `bold ${fs + 2}px ${theme.font.family}`;
      ctx.fillStyle = theme.text;
      const symbolText = [this.symbol, this.timeframe].filter(Boolean).join(' · ');
      ctx.fillText(symbolText, x, y);
      y += fs + 6;
    }

    // OHLC values
    if (this.config.showOHLC) {
      ctx.font = `${fs}px ${theme.font.family}`;
      const isUp = bar.close >= bar.open;
      const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const items = [
        { label: 'O', value: fmt(bar.open), color: theme.text },
        { label: 'H', value: fmt(bar.high), color: theme.text },
        { label: 'L', value: fmt(bar.low), color: theme.text },
        { label: 'C', value: fmt(bar.close), color: isUp ? theme.candleUp : theme.candleDown },
      ];

      if (this.config.showChange) {
        const change = bar.close - prevBar.close;
        const changePct = prevBar.close !== 0 ? (change / prevBar.close) * 100 : 0;
        const sign = change >= 0 ? '+' : '';
        items.push({
          label: '',
          value: `${sign}${fmt(change)} (${sign}${changePct.toFixed(2)}%)`,
          color: change >= 0 ? theme.candleUp : theme.candleDown,
        });
      }

      // Render inline
      let cx = x;
      if (isLeft) {
        for (const item of items) {
          if (item.label) {
            ctx.fillStyle = theme.textSecondary;
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
        ctx.fillStyle = theme.text;
        ctx.fillText(fullText, x, y);
      }
      y += fs + 3;
    }

    // Volume
    if (this.config.showVolume) {
      ctx.font = `${fs - 1}px ${theme.font.family}`;
      ctx.fillStyle = theme.textSecondary;
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
        const text = `${ind.name} ${ind.value}`;
        ctx.fillText(text, ix, y);
        ix += ctx.measureText(text + '  ').width;
      }
    }
  }
}
