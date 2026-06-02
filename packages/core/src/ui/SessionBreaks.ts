import type { ViewportState, Theme, DataSeries } from '@tradecanvas/commons';
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
  private cachedBreaksTyped: { idx: number; kind: 'day' | 'week' | 'month' | 'year'; date: Date }[] = [];
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
   * Find bar indices where a new trading day begins. Each entry also carries
   * the strength of the break: 'day' < 'week' < 'month' < 'year'. Renderer
   * uses this to draw progressively heavier separators + labels.
   */
  private computeBreaksTyped(data: DataSeries): { idx: number; kind: 'day' | 'week' | 'month' | 'year'; date: Date }[] {
    if (data.length < 2) return [];

    // Cache: only recompute when data changes
    if (data.length === this.lastDataLength && this.cachedBreaksTyped.length > 0) {
      return this.cachedBreaksTyped;
    }

    const out: { idx: number; kind: 'day' | 'week' | 'month' | 'year'; date: Date }[] = [];
    let prev = new Date(this.toMs(data[0].time));

    for (let i = 1; i < data.length; i++) {
      const d = new Date(this.toMs(data[i].time));
      if (d.getFullYear() !== prev.getFullYear()) {
        out.push({ idx: i, kind: 'year', date: d });
      } else if (d.getMonth() !== prev.getMonth()) {
        out.push({ idx: i, kind: 'month', date: d });
      } else if (d.getDate() !== prev.getDate()) {
        // Monday (1) is the most common "week start" anchor.
        const isWeekStart = d.getDay() === 1;
        out.push({ idx: i, kind: isWeekStart ? 'week' : 'day', date: d });
      }
      prev = d;
    }

    this.lastDataLength = data.length;
    this.cachedBreaksTyped = out;
    this.cachedBreaks = out.map(b => b.idx);
    return out;
  }

  private toMs(timestamp: number): number {
    return timestamp > 1e12 ? timestamp : timestamp * 1000;
  }

  /** Legacy (kept for compatibility) — returns just the indices. */
  private computeBreaks(data: DataSeries): number[] {
    return this.computeBreaksTyped(data).map(b => b.idx);
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

    const breaks = this.computeBreaksTyped(data);
    if (breaks.length === 0) return;

    // Suppress separators when the dataset is already at day-or-coarser
    // granularity — every bar would be a "day boundary" and the screen
    // would fill with lines.
    const medianStep = medianBarInterval(data);
    if (medianStep >= 23 * 60 * 60 * 1000) return;

    const { chartRect } = viewport;
    const baseColor = this.config.color ?? theme.axisLine;
    const lineWidth = this.config.lineWidth ?? 1;
    const lineStyle = this.config.lineStyle ?? 'dashed';

    ctx.save();
    if (lineStyle === 'dashed') {
      ctx.setLineDash([6, 4]);
    } else if (lineStyle === 'dotted') {
      ctx.setLineDash([2, 3]);
    }
    ctx.font = `600 11px ${theme.font.family}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (const brk of breaks) {
      const x = barIndexToX(brk.idx, viewport) - (viewport.barWidth + viewport.barSpacing) / 2;
      if (x < chartRect.x - 1 || x > chartRect.x + chartRect.width + 1) continue;
      const px = Math.round(x) + 0.5;

      // Heavier line + label as the boundary gets more significant.
      let alpha = 0.25;
      let width = lineWidth;
      let label: string | null = null;
      if (brk.kind === 'day') {
        alpha = 0.22;
      } else if (brk.kind === 'week') {
        alpha = 0.34;
        label = formatMonthDay(brk.date);
      } else if (brk.kind === 'month') {
        alpha = 0.5;
        width = lineWidth + 0.5;
        label = formatMonthYear(brk.date);
      } else {
        alpha = 0.7;
        width = lineWidth + 1;
        label = String(brk.date.getFullYear());
      }

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(px, chartRect.y);
      ctx.lineTo(px, chartRect.y + chartRect.height);
      ctx.stroke();

      if (label) {
        ctx.globalAlpha = Math.min(1, alpha + 0.35);
        ctx.fillStyle = theme.textSecondary;
        ctx.fillText(label, px + 4, chartRect.y + 4);
      }
    }

    ctx.restore();
  }

  /** Invalidate cache when data changes */
  invalidateCache(): void {
    this.lastDataLength = 0;
    this.cachedBreaks = [];
    this.cachedBreaksTyped = [];
  }
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthDay(d: Date): string {
  return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
}

function formatMonthYear(d: Date): string {
  return `${MONTH_ABBR[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/**
 * Median time between bars in ms. Used to gate the day-separator render so
 * daily/weekly/monthly datasets don't pile up redundant separators. A median
 * is robust against single-bar gaps (weekends, halts).
 */
function medianBarInterval(data: { time: number }[]): number {
  if (data.length < 2) return 0;
  const sample = Math.min(50, data.length - 1);
  const diffs: number[] = [];
  for (let i = 1; i <= sample; i++) {
    const a = data[i - 1].time;
    const b = data[i].time;
    const ams = a > 1e12 ? a : a * 1000;
    const bms = b > 1e12 ? b : b * 1000;
    diffs.push(bms - ams);
  }
  diffs.sort((x, y) => x - y);
  return diffs[Math.floor(diffs.length / 2)];
}
