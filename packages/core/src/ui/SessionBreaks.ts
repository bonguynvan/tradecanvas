import type { ViewportState, Theme, DataSeries, TimeZoneSetting } from '@tradecanvas/commons';
import { timeParts, zonedDateFormatter } from '@tradecanvas/commons';
import { barIndexToX } from '../viewport/ScaleMapping.js';
import type { GpuRect } from '../engine/gpu.js';

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

/** The dash pattern of each line style; null for solid. */
const DASHES: Record<NonNullable<SessionBreakConfig['lineStyle']>, [number, number] | null> = {
  solid: null,
  dashed: [6, 4],
  dotted: [2, 3],
};

/** A break on screen: its line's centre and width, its strength, and its label. */
interface BreakMark {
  px: number;
  width: number;
  alpha: number;
  label: string | null;
}

/** A day, week, month or year boundary at bar `idx`. */
interface SessionBreak {
  idx: number;
  kind: 'day' | 'week' | 'month' | 'year';
  /** The bar's time, ms. */
  time: number;
  year: number;
}

/**
 * Renders vertical session break lines on the chart.
 * Detects day boundaries from bar timestamps and draws vertical separators.
 */
export class SessionBreaks {
  private config: SessionBreakConfig = { visible: false };
  private cachedBreaksTyped: SessionBreak[] = [];
  private cachedMedianStep = 0;
  // Explicit validity flag: a series with no day boundaries legitimately
  // yields zero breaks, and keying the cache on `breaks.length > 0` made
  // that case rescan every bar on every frame.
  private cacheValid = false;
  private lastDataLength = 0;
  private locale = 'en-US';
  private tz: TimeZoneSetting = null;

  setConfig(config: Partial<SessionBreakConfig>): void {
    Object.assign(this.config, config);
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  /** Days start at midnight in this timezone (default: the browser's). */
  setTimezone(tz: TimeZoneSetting): void {
    if (tz === this.tz) return;
    this.tz = tz;
    this.invalidateCache();
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
  private computeBreaksTyped(data: DataSeries): SessionBreak[] {
    if (data.length < 2) return [];

    // Cache: only recompute when data changes
    if (this.cacheValid && data.length === this.lastDataLength) {
      return this.cachedBreaksTyped;
    }

    const out: SessionBreak[] = [];
    let prev = timeParts(this.toMs(data[0].time), this.tz);

    for (let i = 1; i < data.length; i++) {
      const time = this.toMs(data[i].time);
      const d = timeParts(time, this.tz);
      if (d.year !== prev.year) {
        out.push({ idx: i, kind: 'year', time, year: d.year });
      } else if (d.month !== prev.month) {
        out.push({ idx: i, kind: 'month', time, year: d.year });
      } else if (d.day !== prev.day) {
        // Monday (1) is the most common "week start" anchor.
        const isWeekStart = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() === 1;
        out.push({ idx: i, kind: isWeekStart ? 'week' : 'day', time, year: d.year });
      }
      prev = d;
    }

    this.lastDataLength = data.length;
    this.cachedBreaksTyped = out;
    this.cachedMedianStep = medianBarInterval(data);
    this.cacheValid = true;
    return out;
  }

  private toMs(timestamp: number): number {
    return timestamp > 1e12 ? timestamp : timestamp * 1000;
  }

  /** The break lines and their labels. */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
  ): void {
    this.renderLines(ctx, viewport, theme, data);
    this.renderLabels(ctx, viewport, theme, data);
  }

  /** The break lines alone: the chart draws them under the bars and the labels over them. */
  renderLines(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
  ): void {
    const marks = this.marks(viewport, data, theme);
    if (marks.length === 0) return;
    const { chartRect } = viewport;
    const look = this.look(theme);
    const dash = DASHES[look.style];

    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.strokeStyle = look.color;
    for (const m of marks) {
      ctx.globalAlpha = m.alpha;
      ctx.lineWidth = m.width;
      ctx.beginPath();
      ctx.moveTo(m.px, chartRect.y);
      ctx.lineTo(m.px, chartRect.y + chartRect.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The labels of week, month and year breaks, drawn over the bars. */
  renderLabels(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
  ): void {
    const marks = this.marks(viewport, data, theme).filter((m): m is BreakMark & { label: string } => m.label !== null);
    if (marks.length === 0) return;
    const { chartRect } = viewport;

    ctx.save();
    ctx.font = `600 11px ${theme.font.family}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.textSecondary;
    for (const m of marks) {
      ctx.globalAlpha = Math.min(1, m.alpha + 0.35);
      ctx.fillText(m.label, m.px + 4, chartRect.y + 4);
    }
    ctx.restore();
  }

  /** The break lines as filled rectangles for the GPU, dashed as the 2D lines are. */
  lineRects(viewport: ViewportState, theme: Theme, data: DataSeries): GpuRect[] {
    const marks = this.marks(viewport, data, theme);
    if (marks.length === 0) return [];
    const { color, style } = this.look(theme);
    const dash = DASHES[style] ?? undefined;
    const { y, height } = viewport.chartRect;
    return marks.map((m) => ({ x: m.px - m.width / 2, y, width: m.width, height, color, alpha: m.alpha, ...(dash ? { dash } : {}) }));
  }

  /** The lines' look: the style overrides, then the breaks' own settings, then the theme. */
  private look(theme: Theme): { color: string; style: NonNullable<SessionBreakConfig['lineStyle']>; width: number } {
    const style = theme.style?.sessionBreaks;
    return {
      color: style?.color ?? this.config.color ?? theme.axisLine,
      style: style?.style ?? this.config.lineStyle ?? 'dashed',
      width: style?.width ?? this.config.lineWidth ?? 1,
    };
  }

  /** The breaks on screen, each with its line and label, heavier as the boundary is more significant. */
  private marks(viewport: ViewportState, data: DataSeries, theme: Theme): BreakMark[] {
    if (!this.config.visible || data.length < 2) return [];

    const breaks = this.computeBreaksTyped(data);
    if (breaks.length === 0) return [];

    // Suppress separators when the dataset is already at day-or-coarser
    // granularity — every bar would be a "day boundary" and the screen
    // would fill with lines.
    if (this.cachedMedianStep >= 23 * 60 * 60 * 1000) return [];

    const { chartRect } = viewport;
    const lineWidth = this.look(theme).width;
    const out: BreakMark[] = [];
    for (const brk of breaks) {
      const x = barIndexToX(brk.idx, viewport) - (viewport.barWidth + viewport.barSpacing) / 2;
      if (x < chartRect.x - 1 || x > chartRect.x + chartRect.width + 1) continue;
      const px = Math.round(x) + 0.5;

      let alpha = 0.25;
      let width = lineWidth;
      let label: string | null = null;
      if (brk.kind === 'day') {
        alpha = 0.22;
      } else if (brk.kind === 'week') {
        alpha = 0.34;
        label = zonedDateFormatter(this.locale, MONTH_DAY, this.tz)(brk.time);
      } else if (brk.kind === 'month') {
        alpha = 0.5;
        width = lineWidth + 0.5;
        label = zonedDateFormatter(this.locale, MONTH_YEAR, this.tz)(brk.time);
      } else {
        alpha = 0.7;
        width = lineWidth + 1;
        label = String(brk.year);
      }
      out.push({ px, width, alpha, label });
    }
    return out;
  }

  /** Invalidate cache when data changes */
  invalidateCache(): void {
    this.lastDataLength = 0;
    this.cachedBreaksTyped = [];
    this.cachedMedianStep = 0;
    this.cacheValid = false;
  }
}

// Month-boundary labels use the FULL year ("Oct 2026"), not a 2-digit one
// ("Oct 26") — a 2-digit year reads identically to a week-boundary's
// "month day" label (e.g. "Oct 26" could mean October 26th), which misled
// readers into thinking the chart had jumped to the wrong date. The
// formatters are cached per locale and zone: these labels re-render on every
// pan/zoom frame.
const MONTH_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const MONTH_YEAR: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };


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
