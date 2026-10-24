import { stepDecimals } from '@tradecanvas/commons';
import { createIcon } from './icons.js';

/**
 * Form controls shared by the settings dialogs and the order ticket: a
 * labelled row, a ticked row, a switch, a number field, a colour picker, a
 * select, a row of choices and a number between − and +. Each calls back on
 * change.
 */

/** A labelled control: clicking the label reaches the control. */
export function settingsRow(label: string, control: HTMLElement): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'tcw-settings-row';
  const text = document.createElement('span');
  text.className = 'tcw-settings-label';
  text.textContent = label;
  row.append(text, control);
  return row;
}

/** A box ticked or not, its label after it: the whole row ticks it. */
export function checkRow(label: string, value: boolean, onChange: (value: boolean) => void): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'tcw-settings-row tcw-check-row';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = value;
  box.addEventListener('change', () => onChange(box.checked));
  const text = document.createElement('span');
  text.className = 'tcw-settings-label';
  text.textContent = label;
  row.append(box, text);
  return row;
}

export function toggleSwitch(value: boolean, onChange: (value: boolean) => void): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = `tcw-toggle${value ? ' tcw-on' : ''}`;
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(value));
  toggle.addEventListener('click', () => {
    const next = !toggle.classList.contains('tcw-on');
    toggle.classList.toggle('tcw-on', next);
    toggle.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  return toggle;
}

export function numberInput(
  value: number,
  range: { min?: number; max?: number; step?: number | 'any' },
  onChange: (value: number) => void,
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'tcw-indi-input';
  input.value = String(value);
  input.step = String(range.step ?? (Number.isInteger(value) ? 1 : 0.001));
  if (range.min !== undefined) input.min = String(range.min);
  if (range.max !== undefined) input.max = String(range.max);
  input.addEventListener('change', () => {
    if (input.value.trim() === '') return;
    let n = Number(input.value);
    if (!Number.isFinite(n)) return;
    if (range.min !== undefined) n = Math.max(range.min, n);
    if (range.max !== undefined) n = Math.min(range.max, n);
    input.value = String(n);
    onChange(n);
  });
  return input;
}

export function colorInput(value: string, onInput: (value: string) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'tcw-indi-color';
  input.value = toHex(value);
  input.addEventListener('input', () => onInput(input.value));
  return input;
}

export function selectInput(
  choices: readonly { value: string; label: string }[],
  value: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'tcw-indi-input tcw-indi-select';
  for (const choice of choices) {
    const opt = document.createElement('option');
    opt.value = choice.value;
    opt.textContent = choice.label;
    select.appendChild(opt);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

/** A colour as `#rrggbb` (what a colour input takes); black if unreadable. */
export function toHex(color: unknown): string {
  if (typeof color !== 'string') return '#000000';
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7).toLowerCase();
  if (/^#[0-9a-f]{3,4}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toLowerCase();
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
  if (m) return `#${[m[1], m[2], m[3]].map((v) => Math.min(255, Number(v)).toString(16).padStart(2, '0')).join('')}`;
  // hsl(), oklch(), a colour's name…: as the browser reads it.
  const read = readByBrowser(c);
  return read !== null && read !== c ? toHex(read) : '#000000';
}

let colourReader: CanvasRenderingContext2D | null | undefined;

/** A colour as a canvas reads it (`#rrggbb` or `rgba(…)`); null where there is no canvas or it isn't a colour. */
function readByBrowser(color: string): string | null {
  if (colourReader === undefined) {
    try {
      colourReader = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    } catch {
      colourReader = null;
    }
  }
  if (!colourReader) return null;
  colourReader.fillStyle = '#010203';
  colourReader.fillStyle = color;
  const out = String(colourReader.fillStyle);
  return out === '#010203' ? null : out;
}

/** The alpha of a colour (1 for `#rgb` / `#rrggbb`). */
export function colorAlpha(color: unknown): number {
  if (typeof color !== 'string') return 1;
  const m = /^rgba\([^)]*,\s*([\d.]+)\s*\)$/i.exec(color.trim());
  return m ? Math.max(0, Math.min(1, Number(m[1]))) : 1;
}

/** `#rrggbb` with an alpha, as `rgba(…)`. */
export function withAlpha(hex: string, alpha: number): string {
  const h = toHex(hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}

/** Arrow keys and where they move a row of choices, as it reads left to right. */
const SEGMENT_MOVES: Record<string, 1 | -1> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * One choice of a few, as a row of buttons (a radio group). The arrow keys
 * move the choice and the focus with it, as a radio group's do (left and
 * right the way the row reads, so mirrored right to left), wrapping at the
 * ends; Home and End go to the first and the last. With a modifier held the
 * keys stay the browser's (Alt+Left goes back).
 */
export function segmentedControl<T extends string>(
  choices: readonly { value: T; label: string }[],
  value: T | string,
  onChange: (value: T) => void,
  label: string,
): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'tcw-segmented';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', label);
  const buttons = choices.map((choice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tcw-segment';
    btn.setAttribute('role', 'radio');
    btn.dataset.value = choice.value;
    btn.textContent = choice.label;
    btn.addEventListener('click', () => choose(choice.value));
    return btn;
  });
  const mark = (current: string) => {
    const at = Math.max(0, buttons.findIndex((btn) => btn.dataset.value === current));
    buttons.forEach((btn, i) => {
      btn.setAttribute('aria-checked', String(btn.dataset.value === current));
      // One Tab stop: the chosen button, or the first when none is.
      btn.tabIndex = i === at ? 0 : -1;
    });
  };
  const choose = (next: T) => {
    mark(next);
    onChange(next);
  };
  group.addEventListener('keydown', (e) => {
    const at = buttons.findIndex((btn) => btn === e.target);
    if (at < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    const last = buttons.length - 1;
    let to: number;
    if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    else if (e.key in SEGMENT_MOVES) {
      const rtl = group.closest('[dir]')?.getAttribute('dir') === 'rtl';
      const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      const by = rtl && horizontal ? -SEGMENT_MOVES[e.key] : SEGMENT_MOVES[e.key];
      to = (at + by + buttons.length) % buttons.length;
    } else return;
    e.preventDefault();
    buttons[to].focus();
    choose(choices[to].value);
  });
  mark(value);
  group.append(...buttons);
  return group;
}

/**
 * `value` moved one `step` up (`dir` 1) or down (-1) on the step's grid: to
 * the next multiple of the step that way, so a value between steps lands on
 * one. Never below one step: there it stays. Written to the step's decimals,
 * so 0.1 + 0.2 is 0.3 and a 1/32 point is exact.
 */
export function stepValue(value: number, dir: 1 | -1, step: number): number {
  if (!(step > 0) || !Number.isFinite(value)) return value;
  const units = value / step;
  const near = Math.round(units);
  const onGrid = Math.abs(units - near) < 1e-9 * Math.max(1, Math.abs(units));
  const k = dir > 0 ? (onGrid ? near + 1 : Math.ceil(units)) : (onGrid ? near - 1 : Math.floor(units));
  if (k < 1) return value;
  return Number((k * step).toFixed(stepDecimals(step)));
}

/** What a stepper needs: its step each way, its buttons' names, how it writes and where an empty field starts. */
export interface StepperOptions {
  /** The step from `value` going `dir`: a price band's own below its edge. */
  step: (value: number, dir: 1 | -1) => number;
  labels: { down: string; up: string };
  /** How a stepped value is written; unset, as a plain number. */
  format?: (value: number) => string;
  /** Where an empty or unreadable field starts from. */
  fallback?: () => number;
}

/**
 * A number field between a − and a +, each moving it by a step on the step's
 * grid (`stepValue`) and telling the field as typing would (an `input`
 * event); the arrow keys in the field do the same. The buttons are no Tab
 * stops of their own: the field is. Figures read left to right in any widget.
 */
export function stepperField(input: HTMLInputElement, options: StepperOptions): { element: HTMLDivElement; down: HTMLButtonElement; up: HTMLButtonElement } {
  const wrap = document.createElement('div');
  wrap.className = 'tcw-stepper';
  wrap.dir = 'ltr';
  const move = (dir: 1 | -1) => {
    const typed = Number(input.value);
    const from = input.value.trim() !== '' && Number.isFinite(typed) ? typed : options.fallback?.() ?? 0;
    const next = stepValue(from, dir, options.step(from, dir));
    input.value = options.format ? options.format(next) : String(next);
    input.dispatchEvent(new Event('input'));
  };
  const button = (dir: 1 | -1, text: string) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tcw-stepper-btn';
    btn.tabIndex = -1;
    btn.setAttribute('aria-label', text);
    btn.innerHTML = createIcon(dir > 0 ? 'plus' : 'minus', 14);
    btn.addEventListener('click', () => move(dir));
    return btn;
  };
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    move(e.key === 'ArrowUp' ? 1 : -1);
  });
  const down = button(-1, options.labels.down);
  const up = button(1, options.labels.up);
  wrap.append(down, input, up);
  return { element: wrap, down, up };
}
