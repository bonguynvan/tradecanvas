import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { autoPricePrecision, formatPrice } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';
import { isDense, renderDenseBars } from './denseBars.js';

/** Bars at least this wide get their high and low written by them. */
const LABEL_MIN_BAR_WIDTH = 28;
const LABEL_GAP = 3;

/**
 * High-low bars: one bar from each bar's low to its high, coloured by its
 * direction (close against open). Wide bars carry their high above and
 * their low below.
 */
export class HiLoRenderer implements ChartRendererInterface {
  private priceText: ((price: number) => string) | null = null;

  /** How its labels print a price (the chart's precision, locale and format); null: decimals. */
  setPriceText(format: ((price: number) => string) | null): void {
    this.priceText = format;
  }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const { min, max } = viewport.priceRange;
    if (max === min) return;
    if (isDense(viewport)) {
      renderDenseBars(ctx, data, viewport, theme.candleUp, theme.candleDown);
      return;
    }
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
    const toY = priceToYMapper(viewport);
    const width = Math.max(1, Math.round(viewport.barWidth * 0.6));
    const labelled = viewport.barWidth >= LABEL_MIN_BAR_WIDTH;
    const precision = autoPricePrecision(min, max);
    const text = (p: number) => viewport.formatPrice?.(p) ?? this.priceText?.(p) ?? formatPrice(p, precision);

    if (labelled) {
      ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
      ctx.textAlign = 'center';
    }
    for (let i = Math.max(0, from); i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = i * barUnit + offsetX;
      const top = Math.min(toY(bar.high), toY(bar.low));
      const bottom = Math.max(toY(bar.high), toY(bar.low));
      const color = bar.close >= bar.open ? theme.candleUp : theme.candleDown;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x - width / 2), top, width, Math.max(1, bottom - top));
      if (!labelled) continue;
      // Upside down, the high is the one below.
      const highAbove = toY(bar.high) <= toY(bar.low);
      ctx.textBaseline = 'bottom';
      ctx.fillText(text(highAbove ? bar.high : bar.low), x, top - LABEL_GAP);
      ctx.textBaseline = 'top';
      ctx.fillText(text(highAbove ? bar.low : bar.high), x, bottom + LABEL_GAP);
    }
  }
}
