import type { ViewportState, Theme, DataSeries } from '@chart-lib/commons';
import { barIndexToX } from '../viewport/ScaleMapping.js';

export interface SessionBreakConfig {
  /** Whether to show session break lines */
  visible: boolean;
  /** Session open/close times as { open: 'HH:MM', close: 'HH:MM' } in exchange local time */
  sessionTimes?: { open: string; close: string };
  /** Line color override (defaults to theme.axisLine with reduced opacity) */
  color?: string;
  /** Line style: 'solid' | 'dashed' | 'dotted' */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Line width (default 1) */
  lineWidth?: number;
}

/**
 * Renders vertical session break lines on the chart.
 * Detects day boundaries from bar timestamps and draws vertical separators.
 */
export class SessionBreaks {
  private config: SessionBreakConfig = { visible: false };
  private cachedBreaks: number[] = [];
  private lastDataLength = 0;

  setConfig(config: Partial<SessionBreakConfig>): void {
    Object.assign(this.config, config);
  }

  isVisible(): boolean {
    return this.config.visible;
  }

  setVisible(visible: boolean): void {
    this.config.visible = visible;
  }

  /**
   * Find bar indices where a new trading day begins.
   * Uses date change detection from bar timestamps.
   */
  private computeBreaks(data: DataSeries): number[] {
    if (data.length < 2) return [];

    // Cache: only recompute when data changes
    if (data.length === this.lastDataLength && this.cachedBreaks.length > 0) {
      return this.cachedBreaks;
    }

    const breaks: number[] = [];
    let prevDay = this.getDayKey(data[0].time);

    for (let i = 1; i < data.length; i++) {
      const day = this.getDayKey(data[i].time);
      if (day !== prevDay) {
        breaks.push(i);
        prevDay = day;
      }
    }

    this.lastDataLength = data.length;
    this.cachedBreaks = breaks;
    return breaks;
  }

  /** Get a day key from a timestamp (seconds or milliseconds) */
  private getDayKey(timestamp: number): string {
    // Auto-detect seconds vs milliseconds
    const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
  ): void {
    if (!this.config.visible || data.length < 2) return;

    const breaks = this.computeBreaks(data);
    if (breaks.length === 0) return;

    const { chartRect } = viewport;
    const color = this.config.color ?? theme.axisLine;
    const lineWidth = this.config.lineWidth ?? 1;
    const lineStyle = this.config.lineStyle ?? 'dashed';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = 0.4;

    if (lineStyle === 'dashed') {
      ctx.setLineDash([6, 4]);
    } else if (lineStyle === 'dotted') {
      ctx.setLineDash([2, 3]);
    }

    ctx.beginPath();

    for (const barIdx of breaks) {
      const x = barIndexToX(barIdx, viewport) - (viewport.barWidth + viewport.barSpacing) / 2;
      // Only draw if visible
      if (x < chartRect.x - 1 || x > chartRect.x + chartRect.width + 1) continue;
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, chartRect.y);
      ctx.lineTo(px, chartRect.y + chartRect.height);
    }

    ctx.stroke();
    ctx.restore();
  }

  /** Invalidate cache when data changes */
  invalidateCache(): void {
    this.lastDataLength = 0;
    this.cachedBreaks = [];
  }
}
