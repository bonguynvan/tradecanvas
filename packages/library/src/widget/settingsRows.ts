import { toHex } from './settingsControls.js';
import type { Translator } from './i18n.js';

/**
 * The rows of the chart settings: a section, a colour, a switch, a choice,
 * a slider and a number, each with its label and calling back on change.
 */

/** Ids for the colour rows' descriptions. */
let colorRowCount = 0;

/** A group of rows; a title names it to a screen reader too (rows named alike under several titles). */
export function settingsSection(title?: string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'tcw-settings-section';
  if (title) {
    const heading = document.createElement('div');
    heading.className = 'tcw-settings-section-title';
    heading.textContent = title;
    div.appendChild(heading);
    div.setAttribute('role', 'group');
    div.setAttribute('aria-label', title);
  }
  return div;
}

function labelledRow(label: string): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tcw-settings-row';
  const lbl = document.createElement('span');
  lbl.className = 'tcw-settings-label';
  lbl.textContent = label;
  row.appendChild(lbl);
  return row;
}

/**
 * A colour of the look, shown again from `look.read()`. With `look.start`,
 * null is the part's own colour: shown as Auto, the picker starting from
 * `start()`, and once set a button takes it back.
 */
export function colorRow(
  label: string,
  value: string | null,
  onChange: (v: string | null) => void,
  look: { read: () => string | null; start?: () => string | number | boolean | null },
  t: Translator,
): { row: HTMLDivElement; sync: () => void } {
  const row = labelledRow(label);
  const wrap = document.createElement('div');
  wrap.className = 'tcw-color-picker-wrap';
  const input = document.createElement('input');
  input.type = 'color';
  input.setAttribute('aria-label', label);
  // What the swatch can't say (Auto, a colour with transparency) is read with it.
  const hex = document.createElement('span');
  hex.className = 'tcw-color-hex';
  hex.id = `tcw-color-${++colorRowCount}`;
  input.setAttribute('aria-describedby', hex.id);

  let back: HTMLButtonElement | null = null;
  const show = (v: string | null) => {
    input.value = toHex(v ?? look.start?.());
    hex.textContent = v ?? t('settings.auto');
    row.classList.toggle('tcw-color-auto', v === null);
    if (v !== null && look.start && !back) {
      back = document.createElement('button');
      back.type = 'button';
      back.className = 'tcw-color-auto-btn';
      back.textContent = t('settings.auto');
      back.setAttribute('aria-label', `${label}: ${t('settings.auto')}`);
      back.addEventListener('click', () => {
        onChange(null);
        // Focus stays in the row as the button goes; the chart may still draw a colour the host set.
        input.focus();
        show(look.read());
      });
      wrap.appendChild(back);
    } else if (v === null && back) {
      back.remove();
      back = null;
    }
  };
  input.addEventListener('input', () => {
    onChange(input.value);
    show(input.value);
  });
  wrap.append(input, hex);
  row.appendChild(wrap);
  show(value);
  return { row, sync: () => show(look.read()) };
}

export function toggleRow(label: string, value: boolean, onChange: (v: boolean) => void): HTMLDivElement {
  const row = labelledRow(label);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = `tcw-toggle${value ? ' tcw-on' : ''}`;
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(value));
  toggle.setAttribute('aria-label', label);
  toggle.addEventListener('click', () => {
    const next = !toggle.classList.contains('tcw-on');
    toggle.classList.toggle('tcw-on', next);
    toggle.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  row.appendChild(toggle);
  return row;
}

export function selectRow(
  label: string,
  value: string,
  options: readonly { label: string; value: string }[],
  onChange: (v: string) => void,
): HTMLDivElement {
  const row = labelledRow(label);
  const select = document.createElement('select');
  select.className = 'tcw-settings-select';
  select.setAttribute('aria-label', label);
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    select.appendChild(o);
  }
  // A value none of the options has (two keys that differ): nothing chosen, so any pick is a change.
  if (!options.some((opt) => opt.value === value)) select.selectedIndex = -1;
  select.addEventListener('change', () => onChange(select.value));
  row.appendChild(select);
  return row;
}

export function rangeRow(
  label: string,
  value: number,
  range: { min: number; max: number; step: number },
  onChange: (v: number) => void,
  format: (v: number) => string = (v) => String(v),
): HTMLDivElement {
  const row = labelledRow(label);
  const wrap = document.createElement('div');
  wrap.className = 'tcw-settings-range';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(range.min);
  input.max = String(range.max);
  input.step = String(range.step);
  input.value = String(value);
  input.setAttribute('aria-label', label);
  const out = document.createElement('span');
  out.className = 'tcw-settings-range-val';
  out.textContent = format(value);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = format(v);
    onChange(v);
  });
  wrap.append(input, out);
  row.appendChild(wrap);
  return row;
}

/** A number field; empty means "worked out from the data" (shown as Auto). Only numbers above 0 are taken. */
export function numberRow(
  label: string,
  value: number | null,
  limits: { step: string; max: number },
  onChange: (v: number | null) => void,
  t: Translator,
): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tcw-settings-row';
  const lbl = document.createElement('label');
  lbl.className = 'tcw-settings-label';
  lbl.textContent = label;
  row.appendChild(lbl);
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'tcw-settings-number';
  input.min = '0';
  input.step = limits.step;
  if (Number.isFinite(limits.max)) input.max = String(limits.max);
  input.placeholder = t('settings.auto');
  input.value = value === null ? '' : String(value);
  input.setAttribute('aria-label', label);
  input.addEventListener('change', () => {
    if (input.value.trim() === '') {
      input.removeAttribute('aria-invalid');
      onChange(null);
      return;
    }
    const v = Number(input.value);
    const ok = Number.isFinite(v) && v > 0 && v <= limits.max && (limits.step !== '1' || Number.isInteger(v));
    input.toggleAttribute('aria-invalid', !ok);
    if (ok) onChange(v);
  });
  row.appendChild(input);
  return row;
}
