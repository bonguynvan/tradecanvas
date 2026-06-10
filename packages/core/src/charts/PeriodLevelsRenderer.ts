import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { computePeriodLevels, type LevelPeriod, type PriceLevel } from './periodLevels.js';

/**
 * Draws prior-period reference levels (PDH / PDL / PDC + the current period's
 * open, or the weekly equivalents) as labelled horizontal lines — the levels
 * intraday traders watch for support/resistance.
 */
export class PeriodLevelsRenderer {
  private visible = false;
  private period: LevelPeriod = 'day';

  setVisible(v: boolean): void {
    this.visible = v;
  }
  isVisible(): boolean {
    return this.visible;
  }
  setPeriod(period: LevelPeriod): void {
    this.period = period;
  }
  getPeriod(): LevelPeriod {
    return this.period;
  }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;
    const levels = computePeriodLevels(data, this.period);
    if (levels.length === 0) return;

    const { chartRect } = viewport;
    const top = chartRect.y;
    const bottom = chartRect.y + chartRect.height;

    ctx.save();
    ctx.font = `600 10px ${theme.font.family}`;
    ctx.textBaseline = 'middle';

    for (const level of levels) {
      const y = priceToY(level.price, viewport);
      if (y < top || y > bottom) continue;
      const color = colorFor(level, theme);

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-aligned tag.
      ctx.globalAlpha = 1;
      const text = level.label;
      const tw = ctx.measureText(text).width;
      const tagX = chartRect.x + chartRect.width - tw - 10;
      ctx.fillStyle = theme.background;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(tagX - 4, y - 7, tw + 8, 14);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(text, tagX, y + 0.5);
    }
    ctx.restore();
  }
}

function colorFor(level: PriceLevel, theme: Theme): string {
  if (level.id.endsWith('h')) return theme.candleUp;
  if (level.id.endsWith('l')) return theme.candleDown;
  return theme.textSecondary;
}
