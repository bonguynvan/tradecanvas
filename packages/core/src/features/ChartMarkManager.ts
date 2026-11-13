import { readChartMarks, MAX_CHART_MARKS, type ChartMark, type ChartMarkKind, type DataSeries, type Theme, type ViewportState } from '@tradecanvas/commons';
import { barIndexToX, timestampToBarIndex } from '../viewport/ScaleMapping.js';
import { labelTextColor } from '../ui/axisValueLabels.js';

/** A badge's diameter (px). */
export const MARK_BADGE_SIZE = 18;
/** Between a badge and the plot's foot, and between two badges side by side. */
const BADGE_MARGIN = 4;
const BADGE_GAP = 2;
/** Pixels around a badge that still count as on it: a finger's tap lands a little off. */
const BADGE_SLOP = 6;
/** The height of the row the badges take at the plot's foot: what else sits there (a widget's buttons) stands above it. */
export const MARK_ROW_HEIGHT = MARK_BADGE_SIZE + 2 * BADGE_MARGIN;

/** How many marks a hovered badge names before it says how many more there are. */
const TOOLTIP_ROWS = 3;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_PAD = 10;
const TOOLTIP_GAP = 8;
const TOOLTIP_ROW_GAP = 8;
const TOOLTIP_LINE = 1.35;
const TOOLTIP_RADIUS = 6;

/** The letter a kind's badge carries. */
const KIND_LETTER: Record<ChartMarkKind, string> = { news: 'N', earnings: 'E', dividend: 'D', split: 'S', event: 'i' };
/** A kind's colour; an event's is the theme's quiet text colour. */
const KIND_COLOR: Record<Exclude<ChartMarkKind, 'event'>, string> = { news: '#4c8dff', earnings: '#f2a93b', dividend: '#4fae8a', split: '#a78bfa' };

/** A badge as drawn: the marks gathered at one place, and where its centre is. */
export interface MarkBadge {
  x: number;
  y: number;
  /** Earliest first. */
  marks: ChartMark[];
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

let markId = 1;

/**
 * Marks on the chart: what happened at a time (a headline, an earnings date),
 * as badges along the foot of the price pane. Marks whose badges would cover
 * one another share one, which says how many it holds.
 */
export class ChartMarkManager {
  private marks: ChartMark[] = [];
  private requestRender: (() => void) | null = null;
  private dataGetter: (() => DataSeries) | null = null;
  /** During a replay: the time it has shown everything before; later marks wait. */
  private revealUntil: number | null = null;
  private revealFrom = -Infinity;
  /** The hovered badge, by its first mark: it is named again after the chart moves. */
  private hoveredId: string | null = null;
  private tooltip: Box | null = null;

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setDataGetter(getter: () => DataSeries): void {
    this.dataGetter = getter;
  }

  /** Replace the marks. What is given is read as untrusted input (`readChartMarks`). */
  setMarks(marks: readonly ChartMark[]): void {
    this.marks = readChartMarks(marks);
    this.requestRender?.();
  }

  /** Add one; its id back, or null for one with no title or time, or one more than the chart keeps. */
  addMark(mark: Omit<ChartMark, 'id'> & { id?: string }): string | null {
    const [read] = readChartMarks([{ ...mark, id: mark.id ?? `tc_mark_${markId++}` }]);
    if (!read) return null;
    const rest = this.marks.filter((m) => m.id !== read.id);
    // Full, and this one is new: a feed gone wrong stops here, as it does in setMarks.
    if (rest.length >= MAX_CHART_MARKS) return null;
    this.marks = [...rest, read].sort((a, b) => a.time - b.time);
    this.requestRender?.();
    return read.id;
  }

  removeMark(id: string): void {
    this.marks = this.marks.filter((m) => m.id !== id);
    this.requestRender?.();
  }

  clearMarks(): void {
    this.marks = [];
    this.requestRender?.();
  }

  getMarks(): ChartMark[] {
    return this.marks.map((m) => ({ ...m }));
  }

  /** How many marks there are. */
  count(): number {
    return this.marks.length;
  }

  /** Show only the marks before `time` (a replay's progress), from `from` on; `null` shows them all again. */
  setRevealUntil(time: number | null, from = -Infinity): void {
    if (time === this.revealUntil && from === this.revealFrom) return;
    this.revealUntil = time;
    this.revealFrom = from;
    this.requestRender?.();
  }

  /** The badge the pointer is over (null: none), drawn with what it marks over it. True when that changed. */
  setHovered(badge: MarkBadge | null): boolean {
    const id = badge?.marks[0]?.id ?? null;
    if (id === this.hoveredId) return false;
    this.hoveredId = id;
    this.requestRender?.();
    return true;
  }

  /** Whether the pointer is over a badge. */
  isHovering(): boolean {
    return this.hoveredId !== null;
  }

  /** Where the hovered badge's words were last drawn; null with none. */
  tooltipBox(): Box | null {
    return this.tooltip ? { ...this.tooltip } : null;
  }

  /**
   * The badges on the plot, left to right: each mark on the bar that holds
   * its time, and marks whose badges would touch gathered into one.
   */
  badges(viewport: ViewportState): MarkBadge[] {
    const data = this.dataGetter?.();
    if (!data || data.length === 0 || this.marks.length === 0) return [];
    const { chartRect } = viewport;
    const y = chartRect.y + chartRect.height - MARK_BADGE_SIZE / 2 - BADGE_MARGIN;
    const badges: MarkBadge[] = [];
    for (const mark of this.marks) {
      if (this.revealUntil !== null && (mark.time < this.revealFrom || mark.time >= this.revealUntil)) continue;
      const index = timestampToBarIndex(mark.time, data);
      // Before the first bar, or past the one forming now: no bar to put it on.
      if (index < 0 || index >= data.length) continue;
      const x = barIndexToX(Math.floor(index), viewport);
      if (x < chartRect.x || x > chartRect.x + chartRect.width) continue;
      const last = badges[badges.length - 1];
      if (last && x - last.x < MARK_BADGE_SIZE + BADGE_GAP) last.marks.push(mark);
      else badges.push({ x, y, marks: [mark] });
    }
    return badges;
  }

  /** The badge under `point`, a few pixels around it too; null off the plot or over none. */
  badgeAt(point: { x: number; y: number }, viewport: ViewportState): MarkBadge | null {
    const { chartRect } = viewport;
    if (point.x < chartRect.x || point.x > chartRect.x + chartRect.width || point.y < chartRect.y || point.y > chartRect.y + chartRect.height) return null;
    const reach = MARK_BADGE_SIZE / 2 + BADGE_SLOP;
    // The nearest of those in reach: two side by side share the pixels between them.
    let found: MarkBadge | null = null;
    let best = Infinity;
    for (const badge of this.badges(viewport)) {
      const dx = Math.abs(point.x - badge.x);
      const dy = Math.abs(point.y - badge.y);
      if (dx > reach || dy > reach || dx >= best) continue;
      best = dx;
      found = badge;
    }
    return found;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.tooltip = null;
    const badges = this.badges(viewport);
    if (badges.length === 0) return;
    const { chartRect } = viewport;
    ctx.save();
    ctx.beginPath();
    ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.clip();
    let hovered: MarkBadge | null = null;
    for (const badge of badges) {
      const on = this.hoveredId !== null && badge.marks.some((m) => m.id === this.hoveredId);
      if (on) hovered = badge;
      this.renderBadge(ctx, badge, theme, on);
    }
    if (hovered) this.renderTooltip(ctx, hovered, viewport, theme);
    ctx.restore();
  }

  private colorOf(mark: ChartMark, theme: Theme): string {
    if (mark.color) return mark.color;
    const kind = mark.kind ?? 'event';
    return kind === 'event' ? theme.textSecondary : KIND_COLOR[kind];
  }

  private renderBadge(ctx: CanvasRenderingContext2D, badge: MarkBadge, theme: Theme, hovered: boolean): void {
    const first = badge.marks[0];
    const color = this.colorOf(first, theme);
    const radius = MARK_BADGE_SIZE / 2;
    // A ring of the ground around it, so it reads over a candle or a volume bar.
    ctx.fillStyle = theme.background;
    ctx.beginPath();
    ctx.arc(badge.x, badge.y, radius + (hovered ? 3 : 1.5), 0, Math.PI * 2);
    ctx.fill();
    if (hovered) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(badge.x, badge.y, radius + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(badge.x, badge.y, radius, 0, Math.PI * 2);
    ctx.fill();
    // One mark shows its letter; several, how many.
    const text = badge.marks.length > 1 ? String(badge.marks.length) : first.label ?? KIND_LETTER[first.kind ?? 'event'];
    ctx.fillStyle = labelTextColor(color);
    ctx.font = `600 ${text.length > 1 ? 10 : 11}px ${theme.font.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, badge.x, badge.y + 0.5);
  }

  /** What the hovered badge marks, over it: each title, its second line under it, and how many more. */
  private renderTooltip(ctx: CanvasRenderingContext2D, badge: MarkBadge, viewport: ViewportState, theme: Theme): void {
    const { chartRect } = viewport;
    const titleSize = theme.font.sizeMedium;
    const textSize = theme.font.sizeSmall;
    const titleFont = `600 ${titleSize}px ${theme.font.family}`;
    const textFont = `${textSize}px ${theme.font.family}`;
    const width = Math.min(TOOLTIP_WIDTH, chartRect.width - 2 * BADGE_MARGIN);
    const inner = width - 2 * TOOLTIP_PAD;
    if (inner <= 0) return;

    // The newest first: what just happened is what is looked for.
    const shown = [...badge.marks].reverse().slice(0, TOOLTIP_ROWS);
    const more = badge.marks.length - shown.length;
    const rows: { text: string; font: string; color: string; height: number; gap: number }[] = [];
    shown.forEach((mark, i) => {
      rows.push({ text: fitText(ctx, mark.title, titleFont, inner), font: titleFont, color: theme.text, height: titleSize * TOOLTIP_LINE, gap: i === 0 ? 0 : TOOLTIP_ROW_GAP });
      if (mark.text) rows.push({ text: fitText(ctx, mark.text, textFont, inner), font: textFont, color: theme.textSecondary, height: textSize * TOOLTIP_LINE, gap: 0 });
    });
    if (more > 0) rows.push({ text: `+${more}`, font: textFont, color: theme.textSecondary, height: textSize * TOOLTIP_LINE, gap: TOOLTIP_ROW_GAP });
    const height = rows.reduce((sum, row) => sum + row.gap + row.height, 0) + 2 * TOOLTIP_PAD;

    // Over the badge, centred on it, kept on the plot by either edge.
    const x = Math.max(chartRect.x + BADGE_MARGIN, Math.min(chartRect.x + chartRect.width - BADGE_MARGIN - width, badge.x - width / 2));
    const y = Math.max(chartRect.y + BADGE_MARGIN, badge.y - MARK_BADGE_SIZE / 2 - TOOLTIP_GAP - height);
    this.tooltip = { x, y, width, height };

    ctx.fillStyle = theme.axisLabelBackground;
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(Math.round(x) + 0.5, Math.round(y) + 0.5, width, height, TOOLTIP_RADIUS);
    else ctx.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, width, height);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let top = y + TOOLTIP_PAD;
    for (const row of rows) {
      top += row.gap;
      ctx.font = row.font;
      ctx.fillStyle = row.color;
      ctx.fillText(row.text, x + TOOLTIP_PAD, top);
      top += row.height;
    }
  }
}

/** `text` cut to `width` in `font`, an ellipsis where it was cut. */
function fitText(ctx: CanvasRenderingContext2D, text: string, font: string, width: number): string {
  ctx.font = font;
  if (ctx.measureText(text).width <= width) return text;
  const chars = [...text];
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (ctx.measureText(`${chars.slice(0, mid).join('').trimEnd()}…`).width <= width) lo = mid;
    else hi = mid - 1;
  }
  return `${chars.slice(0, lo).join('').trimEnd()}…`;
}
