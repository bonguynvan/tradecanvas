import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { barIndexToX } from '../viewport/ScaleMapping.js';
import { isRegularSession, type SessionHoursConfig } from './sessionHours.js';

/** US equity regular trading hours (09:30–16:00 ET) as a sensible default. */
export const DEFAULT_SESSION_HOURS: SessionHoursConfig = {
  startMinute: 9 * 60 + 30,
  endMinute: 16 * 60,
  tzOffsetMinutes: -300,
};

/**
 * Dims bars outside the regular session (pre-/post-market or the overnight
 * break) with a translucent overlay, so the regular session stands out. Drawn
 * on the background layer behind candles.
 */
export class SessionShading {
  private visible = false;
  private config: SessionHoursConfig = { ...DEFAULT_SESSION_HOURS };

  setVisible(v: boolean): void {
    this.visible = v;
  }
  isVisible(): boolean {
    return this.visible;
  }
  setConfig(config: Partial<SessionHoursConfig>): void {
    this.config = { ...this.config, ...config };
  }
  getConfig(): SessionHoursConfig {
    return { ...this.config };
  }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;
    const start = Math.max(0, from);
    const end = Math.min(to, data.length - 1);
    if (end < start) return;

    const barUnit = viewport.barWidth + viewport.barSpacing;
    const isLight = theme.name === 'light';
    ctx.save();
    ctx.fillStyle = isLight ? 'rgba(0,0,0,0.045)' : 'rgba(0,0,0,0.28)';

    // Coalesce consecutive out-of-session bars into one rect to minimise draws.
    let runStart = -1;
    const flush = (lo: number, hi: number): void => {
      const x0 = barIndexToX(lo, viewport) - barUnit / 2;
      const x1 = barIndexToX(hi, viewport) + barUnit / 2;
      ctx.fillRect(x0, chartRect.y, x1 - x0, chartRect.height);
    };
    for (let i = start; i <= end; i++) {
      const out = !isRegularSession(data[i].time, this.config);
      if (out && runStart === -1) runStart = i;
      else if (!out && runStart !== -1) {
        flush(runStart, i - 1);
        runStart = -1;
      }
    }
    if (runStart !== -1) flush(runStart, end);
    ctx.restore();
  }
}
