import { timeParts, wallToUtc, type TimeZoneSetting } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { keepTabInside } from './focusTrap.js';
import { MonthView, type CalendarLabels } from './monthView.js';
import { markPart } from './widgetFeatures.js';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/**
 * A wall-clock date ("2026-03-01") and time ("14:30", empty = midnight) in the
 * display timezone (an IANA zone, minutes east of UTC, or null for the
 * browser's) as a UTC timestamp. Null when the date or time is not valid.
 */
export function wallTimeToUtc(date: string, time: string, tz: TimeZoneSetting): number | null {
  const d = DATE_RE.exec(date);
  const t = time ? TIME_RE.exec(time) : ['', '00', '00'];
  if (!d || !t) return null;
  const [year, month, day, hours, minutes] = [+d[1], +d[2], +d[3], +t[1], +t[2]];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null;
  const wall = Date.UTC(year, month - 1, day, hours, minutes);
  if (new Date(wall).getUTCDate() !== day) return null; // 31 February rolls over: reject
  return wallToUtc(wall, tz);
}

/** The date and time fields' values for `ts` in the display timezone. */
export function utcToWallTime(ts: number, tz: TimeZoneSetting): WallTime {
  const pad = (n: number) => String(n).padStart(2, '0');
  const p = timeParts(ts, tz);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hours)}:${pad(p.minutes)}`,
  };
}

/** A date (YYYY-MM-DD) and a time (HH:MM, or empty for the day's start) on the wall clock. */
export interface WallTime {
  date: string;
  time: string;
}

export interface GoToLabels {
  title: string;
  /** The tabs. */
  date: string;
  range: string;
  /** The range's ends. */
  from: string;
  to: string;
  time: string;
  submit: string;
  cancel: string;
  close: string;
  calendar: CalendarLabels;
}

/** Where to go: a moment to centre, or a span to show edge to edge. */
export type GoToTarget =
  | ({ kind: 'date' } & WallTime)
  | { kind: 'range'; from: WallTime; to: WallTime };

export interface GoToStart {
  /** The Date tab's moment. */
  date: WallTime;
  /** The Custom range tab's ends. */
  range: { from: WallTime; to: WallTime };
  /** Whether bars have a time of day (not on daily bars and longer). */
  withTime: boolean;
  /** The last day that can be picked, YYYY-MM-DD. */
  max?: string;
  /** Today in the time zone the dates are read in; the browser's when left out. */
  today?: string;
}

type Tab = 'date' | 'range';
type Field = 'date' | 'time' | 'fromDate' | 'fromTime' | 'toDate' | 'toTime';

const TABS: readonly Tab[] = ['date', 'range'];

let nextGoToId = 1;

/**
 * The Go to dialog. Date: a day and a time to centre the chart on. Custom
 * range: two of them to show edge to edge. The month under the fields fills
 * the date field in hand; after a range's start it moves on to its end.
 * Mounts in the widget's overlay layer; focus goes back to what opened it.
 */
export class WidgetGoToDate {
  private backdrop: HTMLDivElement | null = null;
  private fieldsEl: HTMLDivElement | null = null;
  private tabButtons: HTMLButtonElement[] = [];
  private month: MonthView | null = null;
  /** The date field the month fills. */
  private active: HTMLInputElement | null = null;
  private values: Record<Field, string> = { date: '', time: '', fromDate: '', fromTime: '', toDate: '', toTime: '' };
  private start: GoToStart | null = null;
  private tab: Tab = 'date';
  private returnFocus: HTMLElement | null = null;
  private readonly uid = nextGoToId++;

  constructor(
    private readonly layer: () => HTMLElement,
    private readonly labels: () => GoToLabels,
    private readonly locale: () => string,
    private readonly onSubmit: (target: GoToTarget) => void,
  ) {}

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  open(start: GoToStart): void {
    this.close(false);
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.start = start;
    this.values = {
      date: start.date.date,
      time: start.date.time,
      fromDate: start.range.from.date,
      fromTime: start.range.from.time,
      toDate: start.range.to.date,
      toTime: start.range.to.time,
    };
    this.build();
    this.renderTab(true);
  }

  /** Close without going anywhere; focus goes back to what opened it unless `giveFocusBack` is false. */
  close(giveFocusBack = true): void {
    if (!this.backdrop) return;
    this.backdrop.remove();
    this.backdrop = this.fieldsEl = this.month = this.active = this.start = null;
    this.tabButtons = [];
    const back = this.returnFocus;
    this.returnFocus = null;
    if (giveFocusBack && back?.isConnected) back.focus();
  }

  destroy(): void {
    this.close(false);
  }

  private build(): void {
    const labels = this.labels();
    const backdrop = document.createElement('div');
    backdrop.className = 'tcw-modal-backdrop';
    // A press that starts in the dialog and ends on the backdrop doesn't close it.
    let pressedBackdrop = false;
    backdrop.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === backdrop;
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && pressedBackdrop) this.close();
      pressedBackdrop = false;
    });

    const modal = document.createElement('div');
    modal.className = 'tcw-modal tcw-goto';
    markPart(modal, 'goToDate');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-goto-title-${this.uid}`);
    modal.tabIndex = -1;
    modal.addEventListener('keydown', (e) => {
      e.stopPropagation(); // typing here must not drive chart shortcuts
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }
      keepTabInside(e, modal);
    });

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.id = `tcw-goto-title-${this.uid}`;
    title.textContent = labels.title;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', labels.close);
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    const form = document.createElement('form');
    form.className = 'tcw-goto-form';
    form.noValidate = true;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
    const fields = document.createElement('div');
    fields.className = 'tcw-goto-fields';
    fields.id = `tcw-goto-panel-${this.uid}`;
    fields.setAttribute('role', 'tabpanel');
    const month = new MonthView(labels.calendar, this.locale(), (value) => this.pickDay(value));
    month.element.classList.add('tcw-goto-calendar');
    form.append(fields, month.element, this.buildFooter(labels));

    modal.append(header, this.buildTabs(labels), form);
    backdrop.appendChild(modal);
    this.layer().appendChild(backdrop);
    this.backdrop = backdrop;
    this.fieldsEl = fields;
    this.month = month;
  }

  private buildTabs(labels: GoToLabels): HTMLDivElement {
    const tabs = document.createElement('div');
    tabs.className = 'tcw-modal-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.addEventListener('keydown', (e) => this.onTabKey(e));
    this.tabButtons = TABS.map((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-modal-tab';
      btn.id = `tcw-goto-tab-${this.uid}-${tab}`;
      btn.dataset.tab = tab;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', `tcw-goto-panel-${this.uid}`);
      btn.textContent = tab === 'date' ? labels.date : labels.range;
      btn.addEventListener('click', () => this.select(tab, false));
      return btn;
    });
    tabs.append(...this.tabButtons);
    return tabs;
  }

  private buildFooter(labels: GoToLabels): HTMLDivElement {
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-footer-cancel';
    cancel.dataset.act = 'cancel';
    cancel.textContent = labels.cancel;
    cancel.addEventListener('click', () => this.close());
    const go = document.createElement('button');
    go.type = 'submit';
    go.className = 'tcw-done-btn';
    go.dataset.act = 'go';
    go.textContent = labels.submit;
    const end = document.createElement('div');
    end.className = 'tcw-footer-end';
    end.append(cancel, go);
    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    footer.appendChild(end);
    return footer;
  }

  private select(tab: Tab, focusTab: boolean): void {
    this.tab = tab;
    this.renderTab(!focusTab);
    if (focusTab) this.tabButtons.find((b) => b.dataset.tab === tab)?.focus();
  }

  /** The tab's fields, the month on its first date; `focusField` puts the keyboard there. */
  private renderTab(focusField: boolean): void {
    const fields = this.fieldsEl;
    const start = this.start;
    if (!fields || !start) return;
    for (const btn of this.tabButtons) {
      const on = btn.dataset.tab === this.tab;
      btn.setAttribute('aria-selected', String(on));
      btn.classList.toggle('tcw-active', on);
      btn.tabIndex = on ? 0 : -1;
    }
    fields.setAttribute('aria-labelledby', `tcw-goto-tab-${this.uid}-${this.tab}`);
    const labels = this.labels();
    fields.replaceChildren(...(this.tab === 'date'
      ? [this.row(null, 'date', 'time', labels)]
      : [this.row(labels.from, 'fromDate', 'fromTime', labels), this.row(labels.to, 'toDate', 'toTime', labels)]));
    const first = fields.querySelector<HTMLInputElement>('input[type="date"]');
    this.setActive(first);
    if (focusField) first?.focus();
  }

  /** A date and, on intraday bars, a time, after the name of the range's end they set. */
  private row(name: string | null, dateField: Field, timeField: Field, labels: GoToLabels): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-goto-row';
    if (name) {
      const label = document.createElement('span');
      label.className = 'tcw-goto-label';
      label.textContent = name;
      row.appendChild(label);
    }
    const prefix = name ? `${name} · ` : '';
    const date = this.input('date', dateField, `${prefix}${labels.date}`);
    date.required = true;
    // The month below is this field's calendar.
    date.dataset.tcwCalendar = 'inline';
    if (this.start?.max) date.max = this.start.max;
    date.addEventListener('focus', () => this.setActive(date));
    date.addEventListener('input', () => {
      date.removeAttribute('aria-invalid');
      if (this.active === date) this.showMonth();
    });
    row.appendChild(date);
    if (this.start?.withTime) row.appendChild(this.input('time', timeField, `${prefix}${labels.time}`));
    return row;
  }

  private input(type: 'date' | 'time', field: Field, label: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.className = 'tcw-goto-input';
    input.dataset.field = field;
    input.value = this.values[field];
    input.setAttribute('aria-label', label);
    input.addEventListener('input', () => {
      this.values[field] = input.value;
    });
    return input;
  }

  private setActive(input: HTMLInputElement | null): void {
    this.active = input;
    this.showMonth();
  }

  private showMonth(): void {
    if (!this.active) return;
    this.month?.show(this.active.value, { max: this.start?.max, today: this.start?.today });
  }

  /** A day from the month: into the field in hand; a range's start then moves on to its end. */
  private pickDay(value: string): void {
    const input = this.active;
    if (!input) return;
    const fromGrid = this.month?.element.contains(document.activeElement) ?? false;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const next = input.dataset.field === 'fromDate'
      ? this.fieldsEl?.querySelector<HTMLInputElement>('[data-field="toDate"]')
      : null;
    if (next) {
      next.focus();
      this.setActive(next);
      return;
    }
    this.showMonth();
    if (fromGrid) this.month?.focusGrid();
  }

  private submit(): void {
    // The fields as they are now, whether or not they said they changed (autofill).
    const inputs = [...(this.fieldsEl?.querySelectorAll<HTMLInputElement>('[data-field]') ?? [])];
    for (const input of inputs) this.values[input.dataset.field as Field] = input.value;
    // A date not given (or not whole), or after the last day: marked, the keyboard on it, and nowhere to go.
    const max = this.start?.max;
    const wrong = inputs.find((input) => input.type === 'date' && (!input.value || (max !== undefined && input.value > max)));
    if (wrong) {
      wrong.setAttribute('aria-invalid', 'true');
      wrong.focus();
      return;
    }
    const v = this.values;
    const withTime = this.start?.withTime ?? false;
    const time = (t: string) => (withTime ? t : '');
    let target: GoToTarget;
    if (this.tab === 'date') {
      if (!v.date) return;
      target = { kind: 'date', date: v.date, time: time(v.time) };
    } else {
      if (!v.fromDate || !v.toDate) return;
      target = { kind: 'range', from: { date: v.fromDate, time: time(v.fromTime) }, to: { date: v.toDate, time: time(v.toTime) } };
    }
    this.close();
    this.onSubmit(target);
  }

  /** Arrow keys (the other way right to left), Home and End move between the tabs. */
  private onTabKey(e: KeyboardEvent): void {
    const at = TABS.indexOf(this.tab);
    const rtl = this.backdrop?.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const [forward, back] = rtl ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
    const next = e.key === forward ? (at + 1) % TABS.length
      : e.key === back ? (at - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    this.select(TABS[next], true);
  }
}
