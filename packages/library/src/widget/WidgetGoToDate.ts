const MINUTE_MS = 60_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/**
 * A wall-clock date ("2026-03-01") and time ("14:30", empty = midnight) in the
 * display timezone (`tzOffsetMinutes` east of UTC; null = the browser's) as a
 * UTC timestamp. Null when the date or time is not valid.
 */
export function wallTimeToUtc(date: string, time: string, tzOffsetMinutes: number | null): number | null {
  const d = DATE_RE.exec(date);
  const t = time ? TIME_RE.exec(time) : ['', '00', '00'];
  if (!d || !t) return null;
  const [year, month, day, hours, minutes] = [+d[1], +d[2], +d[3], +t[1], +t[2]];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null;
  if (tzOffsetMinutes === null) {
    const local = new Date(year, month - 1, day, hours, minutes);
    return local.getDate() === day ? local.getTime() : null; // 31 February rolls over: reject
  }
  const utc = Date.UTC(year, month - 1, day, hours, minutes);
  if (new Date(utc).getUTCDate() !== day) return null;
  return utc - tzOffsetMinutes * MINUTE_MS;
}

/** The date and time fields' values for `ts` in the display timezone. */
export function utcToWallTime(ts: number, tzOffsetMinutes: number | null): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (tzOffsetMinutes === null) {
    const d = new Date(ts);
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }
  const d = new Date(ts + tzOffsetMinutes * MINUTE_MS);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

export interface GoToDateLabels {
  title: string;
  date: string;
  time: string;
  submit: string;
  cancel: string;
}

/**
 * "Go to date" popover: a date and an optional time. Enter submits, Escape or
 * a click outside closes it, and focus returns to whatever opened it.
 */
export class WidgetGoToDate {
  private form: HTMLFormElement | null = null;
  private returnFocus: HTMLElement | null = null;
  /** The button that opened it: pressing it again toggles, so it's not "outside". */
  private opener: Element | null = null;
  private readonly onOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (this.form && !this.form.contains(target) && !this.opener?.contains(target)) this.close();
  };

  constructor(
    private readonly host: HTMLElement,
    private readonly labels: GoToDateLabels,
    private readonly onSubmit: (value: { date: string; time: string }) => void,
  ) {}

  isOpen(): boolean {
    return this.form !== null;
  }

  open(initial: { date: string; time: string }, opener: Element | null = null): void {
    this.close();
    this.opener = opener;
    this.returnFocus = document.activeElement as HTMLElement | null;

    const form = document.createElement('form');
    form.className = 'tcw-goto';
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-label', this.labels.title);

    const title = document.createElement('div');
    title.className = 'tcw-goto-title';
    title.textContent = this.labels.title;

    const date = this.field(form, this.labels.date, 'date', initial.date);
    date.required = true;
    const time = this.field(form, this.labels.time, 'time', initial.time);

    const actions = document.createElement('div');
    actions.className = 'tcw-goto-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-btn';
    cancel.textContent = this.labels.cancel;
    cancel.addEventListener('click', () => this.close());
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'tcw-btn tcw-goto-submit';
    submit.textContent = this.labels.submit;
    actions.append(cancel, submit);

    form.prepend(title);
    form.append(actions);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!date.value) return;
      const value = { date: date.value, time: time.value };
      this.close();
      this.onSubmit(value);
    });
    form.addEventListener('keydown', (e) => {
      e.stopPropagation(); // typing here must not drive chart shortcuts
      if (e.key === 'Escape') this.close();
    });

    this.host.appendChild(form);
    this.form = form;
    document.addEventListener('mousedown', this.onOutside);
    date.focus();
  }

  close(): void {
    if (!this.form) return;
    document.removeEventListener('mousedown', this.onOutside);
    this.form.remove();
    this.form = null;
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back?.isConnected) back.focus();
  }

  destroy(): void {
    this.close();
  }

  private field(form: HTMLFormElement, label: string, type: 'date' | 'time', value: string): HTMLInputElement {
    const wrap = document.createElement('label');
    wrap.className = 'tcw-goto-field';
    const text = document.createElement('span');
    text.textContent = label;
    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.className = 'tcw-goto-input';
    wrap.append(text, input);
    form.appendChild(wrap);
    return input;
  }
}
