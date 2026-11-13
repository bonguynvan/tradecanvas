import type { ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice, lineDash } from '@tradecanvas/commons';
import { AXIS_TAG_TEXT_INSET, fillTag } from '../ui/shapes.js';
import { hLine } from '../charts/pixelGrid.js';
import { labelTextColor } from '../ui/axisValueLabels.js';

/** Where the last-price tag went on the axis, and its colour: the countdown hangs under it. */
export interface LastPriceTag {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/** Height (px) of the last-price tag. */
const TAG_HEIGHT = 20;

/**
 * Renders the current (last) price as a horizontal line with a badge.
 * Updates at high frequency without triggering full chart redraws.
 */
export class CurrentPriceLine {
  private price: number | null = null;
  private previousClose: number | null = null;
  private visible = true;
  private flashUntil = 0;
  /** Fixed decimals for the tag; `null` follows the price axis. */
  private pricePrecision: number | null = null;
  private locale = 'en-US';
  private tag: LastPriceTag | null = null;

  setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * The price shown, and the close its tag is measured from: rising or level
   * against it is up. Without one, it is measured from the price shown
   * before, and the same price again keeps what it was measured from:
   * measured from itself, a fall would show as a rise (a reconnect, a feed's
   * frame at an unchanged price).
   */
  setPrice(price: number, previousClose?: number): void {
    if (this.price !== null && price !== this.price) {
      this.flashUntil = Date.now() + 300;
    }
    if (previousClose !== undefined) this.previousClose = previousClose;
    else if (price !== this.price) this.previousClose = this.price ?? price;
    this.price = price;
  }

  setVisible(v: boolean): void {
    this.visible = v;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setPricePrecision(precision: number | null): void {
    this.pricePrecision = precision;
  }

  getPrice(): number | null {
    return this.price;
  }

  /** The tag as last drawn; null when the last draw showed none. */
  getTag(): LastPriceTag | null {
    return this.tag;
  }

  /** The line and its axis tag together. */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.renderLine(ctx, viewport, theme);
    this.renderTag(ctx, viewport, theme);
  }

  /** Where the line is drawn and in what colour; null when it isn't drawn. */
  private placed(viewport: ViewportState, theme: Theme): { y: number; color: string } | null {
    const look = theme.style?.lastPrice;
    if (!this.visible || this.price === null || look?.visible === false) return null;
    const y = priceToY(this.price, viewport);
    const { chartRect } = viewport;
    if (y < chartRect.y || y > chartRect.y + chartRect.height) return null;
    const isUp = this.previousClose !== null ? this.price >= this.previousClose : true;
    return { y, color: isUp ? (look?.up ?? theme.candleUp ?? '#1fa874') : (look?.down ?? theme.candleDown ?? '#e8505b') };
  }

  /**
   * The line across the plot. Drawn under the chart's objects, so the labels of
   * orders and positions near the last price stay readable over it.
   */
  renderLine(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const at = this.placed(viewport, theme);
    if (!at) return;
    const { y, color } = at;
    const { chartRect } = viewport;
    const look = theme.style?.lastPrice;
    const isFlashing = Date.now() < this.flashUntil;

    // A dotted hairline (unless its style says otherwise): solid, it reads as a line somebody drew.
    const width = look?.width ?? 1;
    ctx.setLineDash(lineDash(look?.style ?? 'dotted', [4, 3], width));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = isFlashing ? 1 : 0.7;
    ctx.beginPath();
    hLine(ctx, chartRect.x, chartRect.x + chartRect.width, Math.round(y) + 0.5, width);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /** The price's tag on the axis, over the axis and its other tags. */
  renderTag(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.tag = null;
    const at = this.placed(viewport, theme);
    if (!at || this.price === null) return;
    const { y, color } = at;
    const { chartRect } = viewport;

    // Price badge on axis
    const axisX = chartRect.x + chartRect.width + 1;
    const precision = this.pricePrecision ?? autoPricePrecision(viewport.priceRange.min, viewport.priceRange.max);
    const text = viewport.formatPrice ? viewport.formatPrice(this.price) : formatPrice(this.price, precision, this.locale);
    // The size the axis's width is measured with (`requiredPriceAxisWidth`).
    ctx.font = `bold 11px ${theme.font.family}`;
    // The axis's width, as every tag on it is: an order's, an alert's and this one line up edge to edge.
    const badgeWidth = (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2;

    ctx.fillStyle = color;
    fillTag(ctx, axisX, y - TAG_HEIGHT / 2, badgeWidth, TAG_HEIGHT, theme);
    this.tag = { x: axisX, y: y - TAG_HEIGHT / 2, width: badgeWidth, height: TAG_HEIGHT, color };

    ctx.fillStyle = labelTextColor(color);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, axisX + AXIS_TAG_TEXT_INSET, y);
  }
}
