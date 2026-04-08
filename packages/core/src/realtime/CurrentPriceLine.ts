import type { ViewportState, Theme } from '@chart-lib/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH } from '@chart-lib/commons';

/**
 * Renders the current (last) price as a horizontal line with a badge.
 * Updates at high frequency without triggering full chart redraws.
 */
export class CurrentPriceLine {
  private price: number | null = null;
  private previousClose: number | null = null;
  private visible = true;
  private animated = true;
  private flashUntil = 0;
  private pricePrecision = 2;

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

  setPricePrecision(precision: number): void {
    this.pricePrecision = precision;
  }

  getPrice(): number | null {
    return this.price;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || this.price === null) return;

    const y = priceToY(this.price, viewport);
    const { chartRect } = viewport;

    if (y < chartRect.y || y > chartRect.y + chartRect.height) return;

    const isUp = this.previousClose !== null ? this.price >= this.previousClose : true;
    const color = isUp ? (theme.candleUp ?? '#26A69A') : (theme.candleDown ?? '#EF5350');
    const isFlashing = Date.now() < this.flashUntil;

    // Dashed price line
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = isFlashing ? 1 : 0.7;
    ctx.beginPath();
    ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
    ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Price badge on axis
    const axisX = chartRect.x + chartRect.width + 1;
    const text = this.price.toFixed(this.pricePrecision);
    ctx.font = `bold 11px ${theme.font.family}`;
    const textWidth = ctx.measureText(text).width;
    const badgeWidth = Math.min(textWidth + 12, PRICE_AXIS_WIDTH - 2);

    ctx.fillStyle = color;
    ctx.fillRect(axisX, y - 10, badgeWidth, 20);

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
