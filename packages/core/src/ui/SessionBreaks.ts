import type { ViewportState, Theme, DataSeries, TimeZoneSetting } from '@tradecanvas/commons';
import { barTimeUnit, timeParts } from '@tradecanvas/commons';
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

/** A break on screen: its line's centre and width, and its strength. */
interface BreakMark {
  px: number;
  width: number;
  alpha: number;
  /** How significant: a year 3, a month 2, a week 1, a day 0. Zoomed out, the lesser give way. */
  rank: number;
}

/** Break lines at least this far apart (px): zoomed out, the lesser ones are left out. */
const MIN_LINE_GAP_PX = 6;

/** The marks, most significant first, each kept unless one already kept is closer than `gap`. */
function thinByRank(marks: readonly BreakMark[], gap: number): BreakMark[] {
  const order = [...marks].sort((a, b) => b.rank - a.rank || a.px - b.px);
  const kept: number[] = [];
  const out: BreakMark[] = [];
  for (const m of order) {
    // Kept xs are sorted: the nearest ones are either side of the insertion point.
    let lo = 0;
    let hi = kept.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (kept[mid] < m.px) lo = mid + 1;
      else hi = mid;
    }
    if ((lo > 0 && m.px - kept[lo - 1] < gap) || (lo < kept.length && kept[lo] - m.px < gap)) continue;
    kept.splice(lo, 0, m.px);
    out.push(m);
  }
  return out.sort((a, b) => a.px - b.px);
}

/** A day, week, month or year boundary at bar `idx`. */
interface SessionBreak {
  idx: number;
  kind: 'day' | 'week' | 'month' | 'year';
}

/**
 * Renders vertical session break lines on the chart.
 * Detects day boundaries from bar timestamps and draws vertical separators.
 * The lines carry no dates: the time axis names the days, months and years at
 * every zoom, and dates along the top of the plot repeated it and ran under
 * the legend.
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
  private tz: TimeZoneSetting = null;

  setConfig(config: Partial<SessionBreakConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * @deprecated The breaks no longer write dates, so the locale changes nothing;
   * the time axis formats the dates. Removed in 2.0.
   */
  setLocale(_locale: string): void {}

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
   * uses this to draw progressively heavier separators.
   */
  private computeBreaksTyped(data: DataSeries): SessionBreak[] {
    if (data.length < 2) return [];

    // Cache: only recompute when data changes
    if (this.cacheValid && data.length === this.lastDataLength) {
      return this.cachedBreaksTyped;
    }

    const out: SessionBreak[] = [];
    const unit = barTimeUnit(data);
    let prev = timeParts(data[0].time * unit, this.tz);

    for (let i = 1; i < data.length; i++) {
      const d = timeParts(data[i].time * unit, this.tz);
      if (d.year !== prev.year) {
        out.push({ idx: i, kind: 'year' });
      } else if (d.month !== prev.month) {
        out.push({ idx: i, kind: 'month' });
      } else if (d.day !== prev.day) {
        // Monday (1) is the most common "week start" anchor.
        const isWeekStart = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() === 1;
        out.push({ idx: i, kind: isWeekStart ? 'week' : 'day' });
      }
      prev = d;
    }

    this.lastDataLength = data.length;
    this.cachedBreaksTyped = out;
    this.cachedMedianStep = medianBarInterval(data);
    this.cacheValid = true;
    return out;
  }

  /** The break lines. */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
  ): void {
    this.renderLines(ctx, viewport, theme, data);
  }

  /** The break lines, which the chart draws under the bars. */
  renderLines(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
  ): void {
    const marks = this.lineMarks(viewport, data, theme);
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

  /**
   * @deprecated Draws nothing: the breaks are lines only, and their dates are
   * on the time axis. Removed in 2.0.
   */
  renderLabels(
    _ctx: CanvasRenderingContext2D,
    _viewport: ViewportState,
    _theme: Theme,
    _data: DataSeries,
  ): void {}

  /** The break lines as filled rectangles for the GPU, dashed as the 2D lines are. */
  lineRects(viewport: ViewportState, theme: Theme, data: DataSeries): GpuRect[] {
    const marks = this.lineMarks(viewport, data, theme);
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

  /** The breaks drawn: those on screen, the lesser left out where they would crowd. */
  private lineMarks(viewport: ViewportState, data: DataSeries, theme: Theme): BreakMark[] {
    return thinByRank(this.marks(viewport, data, theme), MIN_LINE_GAP_PX);
  }

  /** The breaks on screen, each with its line, heavier as the boundary is more significant. */
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
      let rank = 3;
      if (brk.kind === 'day') {
        alpha = 0.22;
        rank = 0;
      } else if (brk.kind === 'week') {
        alpha = 0.34;
        rank = 1;
      } else if (brk.kind === 'month') {
        alpha = 0.5;
        rank = 2;
        width = lineWidth + 0.5;
      } else {
        alpha = 0.7;
        width = lineWidth + 1;
      }
      out.push({ px, width, alpha, rank });
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

/**
 * Median time between bars in ms. Used to gate the day-separator render so
 * daily/weekly/monthly datasets don't pile up redundant separators. A median
 * is robust against single-bar gaps (weekends, halts).
 */
function medianBarInterval(data: { time: number }[]): number {
  if (data.length < 2) return 0;
  const sample = Math.min(50, data.length - 1);
  const unit = barTimeUnit(data);
  const diffs: number[] = [];
  for (let i = 1; i <= sample; i++) {
    diffs.push((data[i].time - data[i - 1].time) * unit);
  }
  diffs.sort((x, y) => x - y);
  return diffs[Math.floor(diffs.length / 2)];
}
