import type { ViewportState, Theme, DataSeries } from '@tradecanvas/commons';
import { barTimeUnit } from '@tradecanvas/commons';
import { fillTag } from './shapes.js';
import { labelTextColor } from './axisValueLabels.js';
import type { LastPriceTag } from '../realtime/CurrentPriceLine.js';

/** Height (px) of the strip the countdown takes under the last-price tag. */
export const COUNTDOWN_HEIGHT = 16;

/**
 * The time left in the forming bar, on the price axis: a strip hung under
 * the last-price tag, in its colour, where the eye already is. It shows
 * only with that tag, for bars that close on the clock, while time is left.
 */
export class BarCountdown {
  private visible = true;
  private timeframeMs = 0;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }

  setTimeframeMs(ms: number): void { this.timeframeMs = ms; }

  /** Whether the countdown has something to show for `data` now (the tag aside). */
  isShown(data: DataSeries): boolean {
    return this.remaining(data) > 0;
  }

  render(ctx: CanvasRenderingContext2D, _viewport: ViewportState, theme: Theme, data: DataSeries, tag: LastPriceTag | null = null): void {
    const remainingMs = this.remaining(data);
    if (tag === null || remainingMs <= 0) return;

    const top = tag.y + tag.height;
    ctx.fillStyle = tag.color;
    fillTag(ctx, tag.x, top, tag.width, COUNTDOWN_HEIGHT, theme);
    ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = labelTextColor(tag.color);
    ctx.fillText(this.formatRemaining(remainingMs), tag.x + 5, top + COUNTDOWN_HEIGHT / 2);
  }

  /** Milliseconds left in the last bar; 0 for tick bars (they close on a count) and closed bars. */
  private remaining(data: DataSeries): number {
    if (!this.visible || !(this.timeframeMs > 0) || data.length === 0) return 0;
    const lastBar = data[data.length - 1];
    const left = lastBar.time * barTimeUnit(data) + this.timeframeMs - Date.now();
    return left > 0 ? left : 0;
  }

  private formatRemaining(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
}
