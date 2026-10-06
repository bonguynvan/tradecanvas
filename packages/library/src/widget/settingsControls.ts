/**
 * Form controls shared by the settings dialogs: a labelled row, a switch, a
 * number field, a colour picker and a select. Each calls back on change.
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
