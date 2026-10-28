import type { ViewportState, Theme, DataSeries, TimeFormatter, TimeZoneSetting } from '@tradecanvas/commons';
import { barDateParts, barsAreDaily, timeParts, tzLabel, barTimeUnit } from '@tradecanvas/commons';
import { barIndexToTime } from '../viewport/ScaleMapping.js';
import { MARK_WEIGHT, TimeMarker, markKind, type MarkKind, type TimeMark } from './timeMarks.js';
import { axisTimes } from '../charts/transforms/axisTimes.js';

const _pad2 = (n: number) => n < 10 ? '0' + n : '' + n;

/** Space kept between the last tick label and the timezone tag. */
export const TZ_LABEL_GAP_PX = 8;

/** Labels (and grid columns) at least this far apart, px. */
export const MIN_LABEL_SPACING_PX = 80;
/** Space kept between two time labels, px. */
const LABEL_GAP_PX = 8;

const monthNames = new Map<string, string[]>();

/** The twelve short month names in `locale` ("Jan" … "Dec"). */
function shortMonths(locale: string): string[] {
  let names = monthNames.get(locale);
  if (!names) {
    let format: Intl.DateTimeFormat;
    try {
      format = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
    } catch {
      format = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
    }
    names = Array.from({ length: 12 }, (_, m) => format.format(Date.UTC(2000, m, 15)));
    monthNames.set(locale, names);
  }
  return names;
}

export class TimeAxis {
  /** An IANA zone, a fixed UTC offset in minutes, or null for the browser's zone. */
  private tz: TimeZoneSetting = null;
  /** The exchange's zone: daily bars built at its midnight are dated there. */
  private exchangeZone: string | null = null;
  private timeFormatter: TimeFormatter | null = null;
  private timesPastData = true;
  private locale = 'en-US';
  private columns: { left: number; right: number }[] = [];
  private readonly marker = new TimeMarker();

  /** The locale month names are written in. */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  setTimezoneOffset(tz: TimeZoneSetting): void {
    this.tz = tz;
  }

  /**
   * The exchange's zone (null: none known). Daily bars stamped at its
   * midnight, as the chart builds them, carry its dates in any zone shown;
   * bars stamped at 00:00 UTC carry the dates they name.
   */
  setExchangeTimeZone(zone: string | null): void {
    this.exchangeZone = zone;
  }

  /** Labels in your words, or null for its own. */
  setTimeFormatter(formatter: TimeFormatter | null): void {
    this.timeFormatter = formatter;
  }

  /**
   * Whether the empty slots past either end of the data get times extrapolated
   * from the bars' spacing. Off for bars not evenly spaced in time (tick bars,
   * Renko bricks): there, a slot has no time of its own.
   */
  setTimesPastData(on: boolean): void {
    this.timesPastData = on;
  }

  getTimesPastData(): boolean {
    return this.timesPastData;
  }

  /**
   * The slots labelled on view, the grid's columns with them: the bars that
   * start the largest calendar steps, at least `MIN_LABEL_SPACING_PX` apart.
   * Nothing left of the oldest bar, whose history isn't loaded; past the
   * newest, the future's slots when times are extrapolated there. Bricks
   * and the like are marked by the times of the bars they were made from
   * (`axisTimes`).
   */
  marks(viewport: ViewportState, data: DataSeries): TimeMark[] {
    const barUnit = viewport.barWidth + viewport.barSpacing;
    if (!(barUnit > 0) || data.length === 0) return [];
    const times = axisTimes(data);
    const marks = this.marker.marks(times, {
      from: Math.floor(viewport.offset / barUnit),
      to: Math.ceil((viewport.offset + viewport.chartRect.width) / barUnit),
      gapBars: MIN_LABEL_SPACING_PX / barUnit,
      tz: this.tz,
      timesPastData: this.timesPastData,
      exchangeZone: this.exchangeZone,
    });
    return times === data ? marks : coarsestKinds(marks);
  }

  /** "2024" where a year starts, "Mar" a month, "15" a day, "13:30" within a day; daily bars by their dates. */
  private label(mark: TimeMark, kind: MarkKind, daily: boolean): string {
    if (this.timeFormatter) return this.timeFormatter(mark.time, { kind, timeZone: this.tz });
    const parts = daily ? barDateParts(mark.time, this.tz, this.exchangeZone) : timeParts(mark.time, this.tz);
    if (kind === 'year') return String(parts.year);
    if (kind === 'month') return shortMonths(this.locale)[parts.month - 1];
    if (kind === 'day') return String(parts.day);
    const clock = `${_pad2(parts.hours)}:${_pad2(parts.minutes)}`;
    // Bars within one minute: their seconds (zones are whole minutes apart).
    return mark.weight === MARK_WEIGHT.within ? `${clock}:${_pad2(new Date(mark.time).getUTCSeconds())}` : clock;
  }

  /** The spans (px) of the labels written on the last draw: the crosshair's time pill clears those it covers. */
  labelColumns(): readonly { left: number; right: number }[] {
    return this.columns;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, series: DataSeries, axisYOverride?: number): void {
    const { chartRect } = viewport;
    // Renko bricks and the like are dated by the bars they were made from.
    const times = axisTimes(series);
    const axisY = axisYOverride ?? (chartRect.y + chartRect.height);

    // Subtle horizontal divider
    ctx.strokeStyle = theme.style?.axis.time.line ?? theme.axisLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(chartRect.x, axisY + 0.5);
    ctx.lineTo(chartRect.x + chartRect.width, axisY + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // The timezone tag sits at the right end: measure it first so a tick
    // label never draws on top of it (they used to merge into "UTC10/2").
    // The offset in force at the right edge: it changes with daylight saving.
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + chartRect.x + viewport.barWidth / 2;
    const to = Math.ceil((viewport.offset + chartRect.width) / barUnit);
    const unit = barTimeUnit(times);
    const rightTime = times.length > 0 ? barIndexToTime(Math.min(to, times.length - 1), times) : Date.now();
    const tzText = tzLabel(this.tz, rightTime * unit);
    const tzFont = `500 ${theme.font.sizeSmall - 1}px ${theme.font.family}`;
    const tzRight = chartRect.x + chartRect.width - 4;
    ctx.font = tzFont;
    const tzLeft = tzRight - ctx.measureText(tzText).width - TZ_LABEL_GAP_PX;

    const plain = `500 ${theme.font.sizeSmall}px ${theme.font.family}`;
    const bold = `600 ${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.style?.axis.time.text ?? theme.axisLabel;

    // Heaviest first, each label where it clears those already placed: a
    // wide one (a long month name, a formatter's own text) can't run into
    // its neighbours, and a year beats the day beside it.
    const placed: { left: number; right: number }[] = [];
    const order = this.marks(viewport, series).sort((a, b) => b.weight - a.weight || a.index - b.index);
    const daily = barsAreDaily(times) === true;
    for (const mark of order) {
      const markX = mark.index * barUnit + offsetX;
      // A bar off the plot has no label on it.
      if (markX < chartRect.x) continue;
      const kind = markKind(mark.weight);
      const label = this.label(mark, kind, daily);
      // A new year stands out from the months and days around it.
      ctx.font = kind === 'year' ? bold : plain;
      const half = ctx.measureText(label).width / 2;
      // A label of a bar by the plot's left edge would be cut there: it starts at the edge instead.
      const x = Math.max(markX, chartRect.x + half);
      if (x + half > tzLeft) continue;
      if (placed.some((p) => x - half < p.right + LABEL_GAP_PX && x + half + LABEL_GAP_PX > p.left)) continue;
      placed.push({ left: x - half, right: x + half });
      ctx.fillText(label, x, axisY + 7);
    }
    this.columns = placed;

    // ─── Timezone indicator (bottom-right) ───
    ctx.font = tzFont;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(tzText, tzRight, axisY + 7);
    ctx.globalAlpha = 1;
  }
}

/** How coarse a mark's label is: a year's, a month's, a day's, a time's. */
const KIND_RANK: Record<MarkKind, number> = { year: 3, month: 2, day: 1, time: 0 };
/** The kinds of label a built series' axis keeps: a step and the one above it. */
const KINDS_KEPT = 2;

/**
 * Bricks and columns stand at uneven times, so a finer step shows up only
 * where two of them happen to fall close (a lone '31' among the months): on
 * their axis only the two coarsest kinds of label on view are kept.
 */
function coarsestKinds(marks: TimeMark[]): TimeMark[] {
  const ranks = [...new Set(marks.map((m) => KIND_RANK[markKind(m.weight)]))].sort((a, b) => b - a);
  if (ranks.length <= KINDS_KEPT) return marks;
  const lowest = ranks[KINDS_KEPT - 1];
  return marks.filter((m) => KIND_RANK[markKind(m.weight)] >= lowest);
}
