import type { ViewportState, Theme } from '@chart-lib/commons';
import { computeTickStep, formatPrice, PRICE_AXIS_WIDTH } from '@chart-lib/commons';

export class PriceAxis {
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const { chartRect, priceRange } = viewport;
    const axisX = chartRect.x + chartRect.width;
    const range = priceRange.max - priceRange.min;
    if (range <= 0) return;
    const invRange = 1 / range;

    // Axis line
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(axisX + 0.5, chartRect.y);
    ctx.lineTo(axisX + 0.5, chartRect.y + chartRect.height);
    ctx.stroke();

    // Compute labels
    const step = computeTickStep(priceRange.min, priceRange.max, 8);
    const firstPrice = Math.ceil(priceRange.min / step) * step;
    const precision = step < 1 ? Math.ceil(-Math.log10(step)) + 1 : 2;
    const font = `${theme.font.sizeSmall}px ${theme.font.family}`;

    // Collect label positions
    const labels: { y: number; text: string }[] = [];
    for (let price = firstPrice; price <= priceRange.max; price += step) {
      const y = chartRect.y + chartRect.height * (1 - (price - priceRange.min) * invRange);
      labels.push({ y, text: formatPrice(price, precision) });
    }

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Batch: all backgrounds first
    ctx.fillStyle = theme.axisLabelBackground;
    for (const { y } of labels) {
      ctx.fillRect(axisX + 1, y - 8, PRICE_AXIS_WIDTH - 2, 16);
    }

    // Batch: all text labels
    ctx.fillStyle = theme.axisLabel;
    for (const { y, text } of labels) {
      ctx.fillText(text, axisX + 5, y);
    }
  }
}
