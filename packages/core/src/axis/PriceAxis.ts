import type { ViewportState, Theme } from '@tradecanvas/commons';
import { computeTickStep, formatPrice, PRICE_AXIS_WIDTH } from '@tradecanvas/commons';

export class PriceAxis {
  private locale = 'en-US';

  setLocale(locale: string): void {
    this.locale = locale;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const { chartRect, priceRange } = viewport;
    const axisX = chartRect.x + chartRect.width;
    const range = priceRange.max - priceRange.min;
    if (range <= 0) return;
    const invRange = 1 / range;

    // Subtle vertical divider — single pixel, less assertive than a solid axis
    // line. Looks closer to TradingView's premium feel.
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(axisX + 0.5, chartRect.y);
    ctx.lineTo(axisX + 0.5, chartRect.y + chartRect.height);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Compute labels
    const step = computeTickStep(priceRange.min, priceRange.max, 8);
    const firstPrice = Math.ceil(priceRange.min / step) * step;
    const precision = step < 1 ? Math.ceil(-Math.log10(step)) + 1 : 2;
    const font = `500 ${theme.font.sizeSmall}px ${theme.font.family}`;

    // Collect label positions
    const labels: { y: number; text: string }[] = [];
    for (let price = firstPrice; price <= priceRange.max; price += step) {
      const y = chartRect.y + chartRect.height * (1 - (price - priceRange.min) * invRange);
      labels.push({ y, text: formatPrice(price, precision, this.locale) });
    }

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Tiny tick marks (3px notch) — gives the axis structure without the heavy
    // background rectangles that the previous implementation drew per label.
    ctx.strokeStyle = theme.axisLine;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    for (const { y } of labels) {
      ctx.moveTo(axisX + 1, y + 0.5);
      ctx.lineTo(axisX + 4, y + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Text labels — single fillStyle pass.
    ctx.fillStyle = theme.axisLabel;
    for (const { y, text } of labels) {
      ctx.fillText(text, axisX + 8, y);
    }
    void PRICE_AXIS_WIDTH;
  }
}
