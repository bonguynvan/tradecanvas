import type { ViewportState, Theme, DataSeries } from '@chart-lib/commons';
import { barIndexToX } from '../viewport/ScaleMapping.js';

export class BarCountdown {
  private visible = true;
  private timeframeMs = 0;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }

  setTimeframeMs(ms: number): void { this.timeframeMs = ms; }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries): void {
    if (!this.visible || this.timeframeMs <= 0 || data.length === 0) return;

    const lastBar = data[data.length - 1];
    // Handle both ms and s timestamps
    const timeMs = lastBar.time > 1e12 ? lastBar.time : lastBar.time * 1000;
    const nextBarTime = timeMs + this.timeframeMs;
    const remainingMs = nextBarTime - Date.now();
    if (remainingMs <= 0) return;

    const text = this.formatRemaining(remainingMs);

    // Position: below the last bar's X, at the bottom of the chart area (above time axis)
    const x = barIndexToX(data.length - 1, viewport);
    const y = viewport.chartRect.y + viewport.chartRect.height - 4;

    // Only render if X is within visible area
    if (x < viewport.chartRect.x || x > viewport.chartRect.x + viewport.chartRect.width) return;

    ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(text, x, y);
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
