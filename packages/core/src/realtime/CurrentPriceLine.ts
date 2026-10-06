import type { ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice, lineDash } from '@tradecanvas/commons';
import { fillTag } from '../ui/shapes.js';

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

  setLocale(locale: string): void {
    this.locale = locale;
  }

  setPrice(price: number, previousClose?: number): void {
    if (this.price !== null && price !== this.price) {
      this.flashUntil = Date.now() + 300;
    }
    this.previousClose = previousClose ?? this.price ?? price;
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

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const look = theme.style?.lastPrice;
    if (!this.visible || this.price === null || look?.visible === false) return;

    const y = priceToY(this.price, viewport);
    const { chartRect } = viewport;

    if (y < chartRect.y || y > chartRect.y + chartRect.height) return;

    const isUp = this.previousClose !== null ? this.price >= this.previousClose : true;
    const color = isUp ? (look?.up ?? theme.candleUp ?? '#1fa874') : (look?.down ?? theme.candleDown ?? '#e8505b');
    const isFlashing = Date.now() < this.flashUntil;

    // Dashed price line (unless its style says otherwise)
    const width = look?.width ?? 1;
    ctx.setLineDash(lineDash(look?.style ?? 'dashed', [4, 3], width));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = isFlashing ? 1 : 0.7;
    ctx.beginPath();
    ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
    ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Price badge on axis
    const axisX = chartRect.x + chartRect.width + 1;
    const precision = this.pricePrecision ?? autoPricePrecision(viewport.priceRange.min, viewport.priceRange.max);
    const text = viewport.formatPrice ? viewport.formatPrice(this.price) : formatPrice(this.price, precision, this.locale);
    ctx.font = `bold 11px ${theme.font.family}`;
    const textWidth = ctx.measureText(text).width;
    const axisWidth = viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH;
    const badgeWidth = Math.min(textWidth + 12, axisWidth - 2);

    ctx.fillStyle = color;
    fillTag(ctx, axisX, y - 10, badgeWidth, 20, theme);

    // Arrow indicator
    const arrowX = axisX - 5;
    ctx.beginPath();
    ctx.moveTo(arrowX, y);
    ctx.lineTo(arrowX + 5, y - 5);
    ctx.lineTo(arrowX + 5, y + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, axisX + 5, y);
  }
}
