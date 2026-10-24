export interface CalendarLabels {
  prevMonth: string;
  nextMonth: string;
  today: string;
}

export interface CalendarDay {
  year: number;
  /** 0–11. */
  month: number;
  day: number;
}

/** The first and last day that can be picked, YYYY-MM-DD; either may be left out. */
export interface DayLimits {
  min?: string;
  max?: string;
}

const DAYS_SHOWN = 42;
const DAYS_IN_WEEK = 7;

/** Regions whose weeks start on Sunday, for engines without week data. */
const SUNDAY_REGIONS = new Set(['US', 'CA', 'MX', 'BR', 'JP', 'KR', 'TW', 'HK', 'IL', 'PH', 'IN', 'ZA', 'AU', 'TH', 'SA', 'PE', 'CO']);

/** The first day of the week where `locale` is spoken: 0 Sunday, 1 Monday. */
export function weekStart(locale: string): 0 | 1 {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info) return info.firstDay === 7 ? 0 : 1;
    return SUNDAY_REGIONS.has(loc.maximize().region ?? '') ? 0 : 1;
  } catch {
    return 1;
  }
}

/** Six whole weeks around month `month` of `year`, from `firstDay` (0 Sunday, 1 Monday). */
export function monthGrid(year: number, month: number, firstDay: 0 | 1): CalendarDay[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() - firstDay + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const days: CalendarDay[] = [];
  for (let i = 0; i < DAYS_SHOWN; i++) {
    const d = new Date(Date.UTC(year, month, 1 - lead + i));
    days.push({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() });
  }
  return days;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: CalendarDay) => `${String(d.year).padStart(4, '0')}-${pad(d.month + 1)}-${pad(d.day)}`;

function parseIso(value: string | undefined): CalendarDay | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

function todayDay(): CalendarDay {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

/** `d` moved by `days` (any sign), across months and years. */
function addDays(d: CalendarDay, days: number): CalendarDay {
  const t = new Date(Date.UTC(d.year, d.month, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth(), day: t.getUTCDate() };
}

/**
 * A month of days drawn by the widget: arrows to turn it, today marked, the
 * chosen day marked, a button for today, and the keys a date grid takes. It
 * only tells which day was picked; what that day goes into is its owner's
 * business (a date field's calendar, the Go to dialog).
 */
export class MonthView {
  readonly element: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private readonly titleEl: HTMLDivElement;
  private chosen = '';
  private limits: DayLimits = {};
  /** The month shown and the day the keys are on. */
  private view = { year: 0, month: 0 };
  private focusDay: CalendarDay = todayDay();

  constructor(
    labels: CalendarLabels,
    private readonly locale: string,
    private readonly onPick: (value: string) => void,
  ) {
    const element = document.createElement('div');
    element.className = 'tcw-calendar';

    const head = document.createElement('div');
    head.className = 'tcw-calendar-head';
    const title = document.createElement('div');
    title.className = 'tcw-calendar-title';
    title.setAttribute('aria-live', 'polite');
    head.append(this.navButton(labels.prevMonth, -1), title, this.navButton(labels.nextMonth, 1));

    const weekdays = document.createElement('div');
    weekdays.className = 'tcw-calendar-weekdays';
    weekdays.setAttribute('aria-hidden', 'true');
    const firstDay = weekStart(locale);
    const dayName = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
    for (let i = 0; i < DAYS_IN_WEEK; i++) {
      // 2023-01-01 was a Sunday.
      const cell = document.createElement('span');
      cell.className = 'tcw-calendar-weekday';
      cell.textContent = dayName.format(new Date(Date.UTC(2023, 0, 1 + ((firstDay + i) % DAYS_IN_WEEK))));
      weekdays.appendChild(cell);
    }

    const grid = document.createElement('div');
    grid.className = 'tcw-calendar-grid';
    grid.setAttribute('role', 'grid');
    grid.addEventListener('keydown', (e) => this.onKey(e));
    grid.addEventListener('click', (e) => {
      const day = (e.target as Element).closest<HTMLButtonElement>('.tcw-calendar-day');
      if (day && !day.disabled && day.dataset.date) this.pick(day.dataset.date);
    });

    const foot = document.createElement('div');
    foot.className = 'tcw-calendar-foot';
    const today = document.createElement('button');
    today.type = 'button';
    today.className = 'tcw-calendar-today';
    today.textContent = labels.today;
    today.addEventListener('click', () => this.pick(iso(todayDay())));
    foot.appendChild(today);

    element.append(head, weekdays, grid, foot);
    this.element = element;
    this.grid = grid;
    this.titleEl = title;
  }

  /** Show the month of `value` (today's when it is no date), that day marked, days outside `limits` greyed. */
  show(value: string, limits: DayLimits = {}): void {
    this.chosen = value;
    this.limits = limits;
    const start = this.clamp(parseIso(value) ?? todayDay());
    this.focusDay = start;
    this.view = { year: start.year, month: start.month };
    this.render();
  }

  /** Moves keyboard focus onto the days. */
  focusGrid(): void {
    this.grid.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }

  private navButton(label: string, by: -1 | 1): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tcw-calendar-nav';
    b.setAttribute('aria-label', label);
    b.innerHTML = by < 0
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5"/></svg>';
    b.addEventListener('click', () => this.turn(by));
    return b;
  }

  private turn(by: number): void {
    const t = new Date(Date.UTC(this.view.year, this.view.month + by, 1));
    this.view = { year: t.getUTCFullYear(), month: t.getUTCMonth() };
    // The keys' day follows into the new month, on the same date where it has one.
    const last = new Date(Date.UTC(this.view.year, this.view.month + 1, 0)).getUTCDate();
    this.focusDay = this.clamp({ ...this.view, day: Math.min(this.focusDay.day, last) });
    this.view = { year: this.focusDay.year, month: this.focusDay.month };
    this.render();
  }

  /** `day` moved inside the limits, so the keys never rest on a greyed day. */
  private clamp(day: CalendarDay): CalendarDay {
    const value = iso(day);
    const min = parseIso(this.limits.min);
    const max = parseIso(this.limits.max);
    if (min && value < iso(min)) return min;
    if (max && value > iso(max)) return max;
    return day;
  }

  private allowed(value: string): boolean {
    const { min, max } = this.limits;
    return !(min && value < min) && !(max && value > max);
  }

  private render(): void {
    const locale = this.locale;
    this.titleEl.textContent = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(this.view.year, this.view.month, 1)));
    const today = iso(todayDay());
    const focus = iso(this.focusDay);
    const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' });
    this.grid.textContent = '';
    let row: HTMLElement | null = null;
    for (const [i, day] of monthGrid(this.view.year, this.view.month, weekStart(locale)).entries()) {
      if (i % DAYS_IN_WEEK === 0) {
        row = document.createElement('div');
        row.className = 'tcw-calendar-week';
        row.setAttribute('role', 'row');
        this.grid.appendChild(row);
      }
      const value = iso(day);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcw-calendar-day';
      b.dataset.date = value;
      b.setAttribute('role', 'gridcell');
      b.textContent = String(day.day);
      b.setAttribute('aria-label', fullDate.format(new Date(Date.UTC(day.year, day.month, day.day))));
      b.setAttribute('aria-selected', String(value === this.chosen));
      b.tabIndex = value === focus ? 0 : -1;
      if (day.month !== this.view.month) b.classList.add('tcw-outside');
      if (value === today) b.classList.add('tcw-today');
      if (!this.allowed(value)) b.disabled = true;
      row?.appendChild(b);
    }
  }

  private onKey(e: KeyboardEvent): void {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -DAYS_IN_WEEK, ArrowDown: DAYS_IN_WEEK };
    const rtl = this.element.isConnected && getComputedStyle(this.element).direction === 'rtl';
    if (e.key in moves) {
      const by = rtl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? -moves[e.key] : moves[e.key];
      this.moveFocus(addDays(this.focusDay, by));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      this.turn(e.key === 'PageUp' ? -1 : 1);
      this.focusGrid();
    } else if (e.key === 'Home' || e.key === 'End') {
      const last = new Date(Date.UTC(this.view.year, this.view.month + 1, 0)).getUTCDate();
      this.moveFocus({ ...this.view, day: e.key === 'Home' ? 1 : last });
    } else if (e.key === 'Enter' || e.key === ' ') {
      this.pick(iso(this.focusDay));
    } else {
      return;
    }
    e.preventDefault();
  }

  private moveFocus(target: CalendarDay): void {
    const day = this.clamp(target);
    this.focusDay = day;
    if (day.year !== this.view.year || day.month !== this.view.month) {
      this.view = { year: day.year, month: day.month };
    }
    this.render();
    this.focusGrid();
  }

  private pick(value: string): void {
    if (this.allowed(value)) this.onPick(value);
  }
}
