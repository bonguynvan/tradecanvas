import type { CalendarChartOptions, CalendarDay, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import { LABEL_SIZE, canvasMeasure, defaultFormat, drawTooltip, fontOf, type Measure, type Rect, type TooltipLine } from './chartKit.js';
import { COLOR_BAR_ROOM, drawColorBar, resolveColorScale, scaleColor, type ResolvedScale } from './colorScale.js';

const DAY_MS = 86_400_000;
/** Calendar years shown at most: a longer range keeps its last ones. */
export const MAX_CALENDAR_YEARS = 10;
/** Cells smaller than this, px, aren't worth drawing: older years give way first. */
const MIN_PITCH = 3;
const PAD = 12;
const MONTH_ROW = 16;
const YEAR_GAP = 10;
const MAX_PITCH = 28;
const LABEL_GAP = 6;

/** The day number (days since 1 January 1970) of a `YYYY-MM-DD` date, or null if it isn't one. */
export function parseDay(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return Math.round(ms / DAY_MS);
}

export function dayToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** 0 Sunday … 6 Saturday. */
const weekdayOf = (day: number) => (((day + 4) % 7) + 7) % 7;

export interface CalendarCell {
  x: number;
  y: number;
  size: number;
  date: string;
  /** The data for the day, if there is any. */
  day?: CalendarDay;
  color: string | null;
}

export interface CalendarLayout {
  cells: CalendarCell[];
  months: { label: string; x: number; y: number }[];
  weekdays: { label: string; x: number; y: number }[];
  years: { label: string; x: number; y: number }[];
  scale: ResolvedScale;
  /** Where the colour bar goes; null without one. */
  bar: Rect | null;
  pitch: number;
  /** How a day reads in the tooltip. */
  formatDate: (date: string) => string;
}

interface Band {
  year: number;
  first: number;
  last: number;
  /** The day number of the band's first week's first row. */
  origin: number;
  weeks: number;
}

function dataRange(options: CalendarChartOptions, byDay: Map<number, CalendarDay>): [number, number] | null {
  let lo = options.from !== undefined ? parseDay(options.from) : null;
  let hi = options.to !== undefined ? parseDay(options.to) : null;
  if (lo === null || hi === null) {
    let min = Infinity;
    let max = -Infinity;
    for (const d of byDay.keys()) {
      if (d < min) min = d;
      if (d > max) max = d;
    }
    lo ??= Number.isFinite(min) ? min : null;
    hi ??= Number.isFinite(max) ? max : null;
  }
  if (lo === null || hi === null || lo > hi) return null;
  const firstYear = new Date(hi * DAY_MS).getUTCFullYear() - MAX_CALENDAR_YEARS + 1;
  return [Math.max(lo, Math.round(Date.UTC(firstYear, 0, 1) / DAY_MS)), hi];
}

/** Each calendar year of the range, with its weeks. */
function bandsOf(from: number, to: number, rowOf: (day: number) => number): Band[] {
  const bands: Band[] = [];
  let start = from;
  while (start <= to) {
    const year = new Date(start * DAY_MS).getUTCFullYear();
    const last = Math.min(to, Math.round(Date.UTC(year, 11, 31) / DAY_MS));
    const origin = start - rowOf(start);
    bands.push({ year, first: start, last, origin, weeks: Math.floor((last - origin) / 7) + 1 });
    start = last + 1;
  }
  return bands;
}

interface NameFormats {
  month: Intl.DateTimeFormat;
  weekday: Intl.DateTimeFormat;
  long: Intl.DateTimeFormat;
}

const formatsByLocale = new Map<string, NameFormats>();

/** Month, weekday and date formats for a locale, made once; one it doesn't know gives the browser's. */
function nameFormats(locale: string | undefined): NameFormats {
  const key = locale ?? '';
  let formats = formatsByLocale.get(key);
  if (!formats) {
    try {
      formats = {
        month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
        weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }),
        long: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }),
      };
    } catch {
      formats = nameFormats(undefined);
    }
    formatsByLocale.set(key, formats);
  }
  return formats;
}

/**
 * Days in week columns and weekday rows, a calendar year to a band, for a
 * chart `width` × `height`; the cells stay square and no larger than 28 px.
 */
export function computeCalendarLayout(options: CalendarChartOptions, width: number, height: number, theme: Theme, measure: Measure): CalendarLayout {
  // A day with no finite value is a day without data.
  const byDay = new Map<number, CalendarDay>();
  for (const d of options.data) {
    const n = parseDay(d.date);
    if (n !== null && Number.isFinite(d.value)) byDay.set(n, d);
  }
  const names = nameFormats(options.locale);
  const formatDate = options.dateFormat ?? ((date: string) => names.long.format(new Date(`${date}T00:00:00Z`)));
  const fiveDay = options.weekdays === 5;
  const shown = (day: number) => !fiveDay || (weekdayOf(day) >= 1 && weekdayOf(day) <= 5);
  const range = dataRange(options, byDay);
  const roomW = width - PAD * 2;
  const legendRoom = options.legend === false ? 0 : COLOR_BAR_ROOM;
  const rows = fiveDay ? 5 : 7;
  const weekStart = fiveDay ? 1 : (options.weekStart ?? 1);
  const rowOf = (day: number) => (weekdayOf(day) - weekStart + 7) % 7;
  // As many years as fit at a readable size: the oldest give way.
  let bands = range ? bandsOf(range[0], range[1], rowOf) : [];
  const roomFor = (n: number) => height - PAD * 2 - legendRoom - n * MONTH_ROW - (n - 1) * YEAR_GAP;
  while (bands.length > 1 && roomFor(bands.length) / (bands.length * rows) < MIN_PITCH) bands = bands.slice(1);
  // Colours over the days on show only.
  const visible: number[] = [];
  for (const [day, d] of byDay) {
    if (bands.length > 0 && day >= bands[0].first && day <= bands[bands.length - 1].last && shown(day)) visible.push(d.value);
  }
  const scale = resolveColorScale(visible, theme, options.colorScale);
  const empty: CalendarLayout = { cells: [], months: [], weekdays: [], years: [], scale, bar: null, pitch: 0, formatDate };
  if (bands.length === 0 || roomW <= 0 || roomFor(bands.length) <= 0) return empty;

  const multiYear = bands.length > 1;
  const yearLabels = bands.map((b) => String(b.year));
  // A weekday's name from a week known to start on a Sunday (4 January 1970).
  const weekdayNames = Array.from({ length: rows }, (_, r) => names.weekday.format(new Date((3 + weekStart + r) * DAY_MS)));
  const labelWidth = Math.max(
    ...weekdayNames.map((n) => measure(n, LABEL_SIZE - 1)),
    ...(multiYear ? yearLabels.map((n) => measure(n, LABEL_SIZE)) : [0]),
  );
  const left = PAD + labelWidth + LABEL_GAP;
  const columns = Math.max(...bands.map((b) => b.weeks));
  const pitch = Math.min(MAX_PITCH, (width - left - PAD) / columns, roomFor(bands.length) / (bands.length * rows));
  if (!(pitch > 0)) return empty;
  const gap = pitch >= 6 ? Math.max(1, Math.round(pitch * 0.12)) : 0;
  const size = pitch - gap;
  const gridWidth = columns * pitch;
  // The calendar sits in the middle of the room it doesn't fill.
  const x0 = left + Math.max(0, (width - left - PAD - gridWidth) / 2);

  const layout: CalendarLayout = { ...empty, pitch };
  let top = PAD;
  for (const [i, band] of bands.entries()) {
    const gridTop = top + MONTH_ROW;
    if (multiYear) layout.years.push({ label: yearLabels[i], x: x0 - LABEL_GAP, y: top });
    let month = -1;
    let lastLabelEnd = -Infinity;
    for (let day = band.first; day <= band.last; day++) {
      if (!shown(day)) continue;
      const x = x0 + Math.floor((day - band.origin) / 7) * pitch;
      const y = gridTop + rowOf(day) * pitch;
      const data = byDay.get(day);
      layout.cells.push({ x, y, size, date: dayToIso(day), day: data, color: data && Number.isFinite(data.value) ? scaleColor(data.value, scale) : null });
      const m = new Date(day * DAY_MS).getUTCMonth();
      if (m !== month) {
        month = m;
        const label = names.month.format(new Date(day * DAY_MS));
        const labelEnd = x + measure(label, LABEL_SIZE - 1);
        if (x >= lastLabelEnd && labelEnd <= width) {
          layout.months.push({ label, x, y: top });
          lastLabelEnd = labelEnd + 4;
        }
      }
    }
    // Every row named when they have room, else every other one.
    if (pitch >= 8) {
      const every = pitch >= 13 ? 1 : 2;
      for (let r = 0; r < rows; r += every) {
        layout.weekdays.push({ label: weekdayNames[r], x: x0 - LABEL_GAP, y: gridTop + r * pitch + size / 2 });
      }
    }
    top = gridTop + rows * pitch + YEAR_GAP;
  }
  if (legendRoom > 0) {
    layout.bar = { x: x0, y: top - YEAR_GAP + 8, width: Math.min(gridWidth, width - x0 - PAD), height: legendRoom - 8 };
  }
  return layout;
}

/** The day under the pointer. */
export function hitDay(layout: CalendarLayout, x: number, y: number): CalendarCell | null {
  for (const c of layout.cells) {
    if (x >= c.x && x < c.x + layout.pitch && y >= c.y && y < c.y + layout.pitch) return c;
  }
  return null;
}

export function renderCalendar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: CalendarChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: CalendarLayout = computeCalendarLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): CalendarLayout {
  const format = options.valueFormat ?? defaultFormat;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  const hovered = pointer && options.crosshair !== false ? hitDay(layout, pointer.x, pointer.y) : null;
  const blank = withAlpha(theme.textSecondary, 0.12);
  const radius = layout.pitch >= 10 ? 2 : 0;
  ctx.save();
  for (const c of layout.cells) {
    ctx.fillStyle = c.color ?? blank;
    ctx.beginPath();
    if (radius > 0 && typeof ctx.roundRect === 'function') ctx.roundRect(c.x, c.y, c.size, c.size, radius);
    else ctx.rect(c.x, c.y, c.size, c.size);
    ctx.fill();
  }
  if (hovered) {
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hovered.x - 0.75, hovered.y - 0.75, hovered.size + 1.5, hovered.size + 1.5);
  }

  ctx.fillStyle = theme.textSecondary;
  ctx.font = fontOf(theme, LABEL_SIZE - 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const m of layout.months) ctx.fillText(m.label, m.x, m.y);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const w of layout.weekdays) ctx.fillText(w.label, w.x, w.y);
  ctx.font = fontOf(theme, LABEL_SIZE, '600');
  ctx.fillStyle = theme.text;
  ctx.textBaseline = 'top';
  for (const y of layout.years) ctx.fillText(y.label, y.x, y.y);
  ctx.restore();

  if (layout.bar) drawColorBar(ctx, layout.bar, layout.scale, format, theme);

  if (hovered && pointer) {
    const lines: TooltipLine[] = [{ text: layout.formatDate(hovered.date), bold: true, color: hovered.color ?? undefined }];
    if (hovered.day) {
      lines.push({ text: format(hovered.day.value) });
      for (const [key, val] of Object.entries(hovered.day.meta ?? {})) lines.push({ text: `${key}: ${String(val)}` });
    } else {
      lines.push({ text: '–' });
    }
    drawTooltip(ctx, lines, pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
