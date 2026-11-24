import type { ViewportState, Theme, DataSeries, TimeFormatter, TimeZoneSetting } from '@tradecanvas/commons';
import { barDateParts, barsAreDaily, timeParts, tzLabel, barTimeUnit } from '@tradecanvas/commons';
import { barIndexToTime } from '../viewport/ScaleMapping.js';
import { MARK_WEIGHT, TimeMarker, markKind, type MarkKind, type TimeMark } from './timeMarks.js';
import { axisTimes } from '../charts/transforms/axisTimes.js';
import { hLine } from '../charts/pixelGrid.js';
import { writtenDate, writtenMonth } from './writtenDate.js';

const _pad2 = (n: number) => n < 10 ? '0' + n : '' + n;

/** Space kept between the last tick label and the timezone tag. */
export const TZ_LABEL_GAP_PX = 8;

/** Labels (and grid columns) at least this far apart, px. */
export const MIN_LABEL_SPACING_PX = 80;
/** The least room between two lines of a grid ruled at periods, px: closer, they read as a tint, and a coarser period is ruled. */
const MIN_PERIOD_GAP_PX = 40;
/** Space kept between two time labels, px. */
const LABEL_GAP_PX = 8;
/** Space between the plot's left edge and the date tag, as the timezone tag keeps at the right. */
const DATE_TAG_INSET_PX = 4;

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

  /** A date as far as its `finest` part: "2023", "Mar 2023" or "Mar 15, 2023", in the locale. */
  private writtenTo(finest: number, time: number, daily: boolean): string {
    const parts = daily ? barDateParts(time, this.tz, this.exchangeZone) : timeParts(time, this.tz);
    if (finest >= KIND_RANK.year) return String(parts.year);
    if (finest === KIND_RANK.month) return writtenMonth(this.locale, parts.year, parts.month);
    return writtenDate(this.locale, parts.year, parts.month, parts.day, true);
  }

  /**
   * The tag at the left end with what the labels leave unsaid: the year where
   * they are months, the month and year where they are days, the whole date
   * where they are times. Panned back into history, the axis otherwise reads
   * "Mar … Apr" with no year until a January comes on view. None where a year
   * is labelled, or the labels are your formatter's, or there is no room.
   *
   * Labels it would cover are left out, and it says what they said: over a
   * "Mar" it reads "Mar 2023" and is dated by that label, so a "15" after it
   * is still read as March's. A time it covers is left out.
   */
  private dateTag(ctx: CanvasRenderingContext2D, labels: readonly AxisLabel[], firstTime: number | null, daily: boolean, left: number, limit: number): DateTag | null {
    if (this.timeFormatter) return null;
    const coarsest = labels.reduce((rank, l) => Math.max(rank, KIND_RANK[l.kind]), NO_LABEL_RANK);
    if (coarsest >= KIND_RANK.year) return null;
    let finest = Math.max(KIND_RANK.day, coarsest + 1);
    let time = firstTime;
    let covered: readonly AxisLabel[] = [];
    // Each label taken in may widen the tag over the next one: a few rounds settle it.
    for (let round = 0; round < TAG_ROUNDS; round++) {
      if (time === null) return null;
      const text = this.writtenTo(finest, time, daily);
      const right = left + ctx.measureText(text).width;
      if (right + TZ_LABEL_GAP_PX > limit) return null;
      const under = labels.filter((l) => l.left < right + LABEL_GAP_PX);
      if (under.length === covered.length) return { text, left, right, covered: under };
      covered = under;
      // A day or a month it covers it must name; a time it covers adds nothing to the date.
      finest = covered.reduce((f, l) => (KIND_RANK[l.kind] >= KIND_RANK.day ? Math.min(f, KIND_RANK[l.kind]) : f), finest);
      time = covered.reduce((last, l) => (l.left > last.left ? l : last)).time;
    }
    return null;
  }

  /** The spans (px) of the labels written on the last draw: the crosshair's time pill clears those it covers. */
  /**
   * The slots where a period begins on view, for a grid ruled at periods
   * (`grid.vertical.periodsOnly`): a day's start on an intraday chart, a
   * month's on a chart of days, a year's among weeks and months, in the
   * zone the axis shows; a coarser step's where those would be closer than
   * the least gap. They are the bars' own, not the labels the axis has room
   * for.
   */
  periodMarks(viewport: ViewportState, data: DataSeries): TimeMark[] {
    const barUnit = viewport.barWidth + viewport.barSpacing;
    if (!(barUnit > 0) || data.length === 0) return [];
    return this.marker.periods(axisTimes(data), {
      from: Math.floor(viewport.offset / barUnit),
      to: Math.ceil((viewport.offset + viewport.chartRect.width) / barUnit),
      gapBars: MIN_PERIOD_GAP_PX / barUnit,
      tz: this.tz,
      timesPastData: this.timesPastData,
      exchangeZone: this.exchangeZone,
    });
  }

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
    hLine(ctx, chartRect.x, chartRect.x + chartRect.width, axisY + 0.5);
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

    const order = this.marks(viewport, series).sort((a, b) => b.weight - a.weight || a.index - b.index);
    const daily = barsAreDaily(times) === true;

    // Heaviest first, each label where it clears those already placed: a
    // wide one (a long month name, a formatter's own text) can't run into
    // its neighbours, and a year beats the day beside it.
    const labels: AxisLabel[] = [];
    for (const mark of order) {
      const markX = mark.index * barUnit + offsetX;
      // A bar off the plot has no label on it.
      if (markX < chartRect.x) continue;
      const kind = markKind(mark.weight);
      const text = this.label(mark, kind, daily);
      // A new year, month or day stands out from the times around it: where one day ends is read at a glance.
      const font = kind === 'time' ? plain : bold;
      ctx.font = font;
      const half = ctx.measureText(text).width / 2;
      // A label of a bar by the plot's left edge would be cut there: it starts at the edge instead.
      const x = Math.max(markX, chartRect.x + half);
      if (x + half > tzLeft) continue;
      if (labels.some((p) => x - half < p.right + LABEL_GAP_PX && x + half + LABEL_GAP_PX > p.left)) continue;
      labels.push({ left: x - half, right: x + half, x, text, font, kind, time: mark.time });
    }

    // The date the labels leave unsaid, as of the first bar on view (past the
    // last bar, the time its slot is given), in the timezone tag's style.
    const firstOnView = Math.max(0, Math.ceil((chartRect.x - offsetX) / barUnit));
    const firstIndex = this.timesPastData ? firstOnView : Math.min(firstOnView, times.length - 1);
    const firstTime = times.length > 0 ? barIndexToTime(firstIndex, times) * unit : null;
    ctx.font = tzFont;
    const tag = this.dateTag(ctx, labels, firstTime, daily, chartRect.x + DATE_TAG_INSET_PX, tzLeft);
    const shown = tag ? labels.filter((l) => !tag.covered.includes(l)) : labels;
    for (const l of shown) {
      ctx.font = l.font;
      ctx.fillText(l.text, l.x, axisY + 7);
    }
    this.columns = [...(tag ? [{ left: tag.left, right: tag.right }] : []), ...shown.map((l) => ({ left: l.left, right: l.right }))];

    // ─── Timezone indicator (bottom-right), and the date tag (bottom-left) in its style ───
    ctx.font = tzFont;
    ctx.textBaseline = 'top';
    // The theme's quieter text at full strength: faded to three quarters it was under 4:1 on both grounds.
    ctx.fillStyle = theme.textSecondary;
    ctx.textAlign = 'right';
    ctx.fillText(tzText, tzRight, axisY + 7);
    if (tag) {
      ctx.textAlign = 'left';
      ctx.fillText(tag.text, tag.left, axisY + 7);
    }
    ctx.globalAlpha = 1;
  }
}

/** How coarse a mark's label is: a year's, a month's, a day's, a time's. */
const KIND_RANK: Record<MarkKind, number> = { year: 3, month: 2, day: 1, time: 0 };
/** Below every kind: no label on view. */
const NO_LABEL_RANK = -1;
/** Most times the date tag widens to take in a label it covers. */
const TAG_ROUNDS = 4;

/** A tick label as placed: its span, its text and font, what it marks. */
interface AxisLabel {
  left: number;
  right: number;
  x: number;
  text: string;
  font: string;
  kind: MarkKind;
  /** The marked bar's time, ms. */
  time: number;
}

/** The date tag at the left end, and the labels it stands in for. */
interface DateTag {
  text: string;
  left: number;
  right: number;
  covered: readonly AxisLabel[];
}
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
