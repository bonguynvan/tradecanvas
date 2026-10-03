import type { DataSeries, Theme, ViewportState } from '@tradecanvas/commons';
import { PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';

export type PriceLineKind = 'high' | 'low' | 'bid' | 'ask';

export interface PriceLineLevel {
  kind: PriceLineKind;
  price: number;
}

/** A quote: the best bid and ask. */
export interface BidAsk {
  bid?: number;
  ask?: number;
}

const DASH = [2, 3];
const TAG_HEIGHT = 16;

/**
 * Lines across the price pane with a tag on the price axis: the highest
 * high and lowest low of the bars on screen, and the bid and ask.
 */
export class PriceLines {
  private highLow = false;
  private quote: BidAsk | null = null;

  /** Mark the highest high and lowest low of the bars on screen. */
  setHighLow(visible: boolean): void {
    this.highLow = visible;
  }

  isHighLowVisible(): boolean {
    return this.highLow;
  }

  /** The best bid and ask, or null to take them off. */
  setBidAsk(quote: BidAsk | null): void {
    this.quote = quote ? { ...quote } : null;
  }

  getBidAsk(): BidAsk | null {
    return this.quote ? { ...this.quote } : null;
  }

  /** The levels to draw over `data` as the viewport shows it. */
  levels(data: DataSeries, viewport: ViewportState): PriceLineLevel[] {
    const out: PriceLineLevel[] = [];
    if (this.highLow) {
      const from = Math.max(0, viewport.visibleRange.from);
      const to = Math.min(data.length - 1, viewport.visibleRange.to);
      let high = -Infinity;
      let low = Infinity;
      for (let i = from; i <= to; i++) {
        if (data[i].high > high) high = data[i].high;
        if (data[i].low < low) low = data[i].low;
      }
      if (Number.isFinite(high)) out.push({ kind: 'high', price: high });
      if (Number.isFinite(low)) out.push({ kind: 'low', price: low });
    }
    const { bid, ask } = this.quote ?? {};
    if (bid !== undefined && Number.isFinite(bid)) out.push({ kind: 'bid', price: bid });
    if (ask !== undefined && Number.isFinite(ask)) out.push({ kind: 'ask', price: ask });
    return out;
  }

  /** The lines, across the price pane. */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries): void {
    const { chartRect } = viewport;
    ctx.save();
    ctx.setLineDash(DASH);
    ctx.lineWidth = 1;
    for (const level of this.levels(data, viewport)) {
      const y = Math.round(priceToY(level.price, viewport)) + 0.5;
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;
      ctx.strokeStyle = colorOf(level.kind, theme);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Their tags, on the price axis (drawn over its labels). */
  renderAxisTags(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries): void {
    const { chartRect } = viewport;
    const axisX = chartRect.x + chartRect.width + 1;
    const width = (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2;
    const precision = autoPricePrecision(viewport.priceRange.min, viewport.priceRange.max);
    ctx.save();
    ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (const level of this.levels(data, viewport)) {
      const y = priceToY(level.price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;
      ctx.fillStyle = colorOf(level.kind, theme);
      ctx.fillRect(axisX, y - TAG_HEIGHT / 2, width, TAG_HEIGHT);
      ctx.fillStyle = theme.background;
      ctx.fillText(viewport.formatPrice?.(level.price) ?? formatPrice(level.price, precision), axisX + 5, y);
    }
    ctx.restore();
  }
}

function colorOf(kind: PriceLineKind, theme: Theme): string {
  switch (kind) {
    case 'bid': return theme.candleUp;
    case 'ask': return theme.candleDown;
    default: return theme.textSecondary;
  }
}
