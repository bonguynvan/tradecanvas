import { createIcon } from './icons.js';

export type IndicatorParamValue = number | string | boolean;

export interface IndicatorSettingsTarget {
  instanceId: string;
  name: string;
  /** Default config — defines the editable keys and their types. */
  defaults: Record<string, unknown>;
  /** Current values, overlaid on defaults. */
  params: Record<string, unknown>;
}

export interface IndicatorSettingsCallbacks {
  onApply: (instanceId: string, params: Record<string, IndicatorParamValue>) => void;
  onClose: () => void;
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function titleCase(key: string): string {
  // camelCase / snake_case → "Title Case"
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Per-indicator parameter editor. Introspects the indicator's default config to
 * decide each control (number → stepper, boolean → toggle, hex string → color,
 * other string → text) and applies edits live via `onApply`.
 */
export class WidgetIndicatorSettings {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private callbacks: IndicatorSettingsCallbacks;
  private target: IndicatorSettingsTarget | null = null;
  private draft: Record<string, IndicatorParamValue> = {};

  constructor(host: HTMLElement, callbacks: IndicatorSettingsCallbacks) {
    this.callbacks = callbacks;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal tcw-modal-narrow';

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    this.titleEl = document.createElement('h3');
    this.titleEl.textContent = 'Indicator';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(this.titleEl);
    header.appendChild(closeBtn);

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-modal-body';

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'tcw-reset-link';
    resetBtn.textContent = 'Reset to defaults';
    resetBtn.addEventListener('click', () => this.resetDefaults());
    const doneBtn = document.createElement('button');
    doneBtn.className = 'tcw-done-btn';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', () => this.close());
    footer.appendChild(resetBtn);
    footer.appendChild(doneBtn);

    this.modal.appendChild(header);
    this.modal.appendChild(this.bodyEl);
    this.modal.appendChild(footer);
    this.backdrop.appendChild(this.modal);
    host.appendChild(this.backdrop);
  }

  open(target: IndicatorSettingsTarget): void {
    this.target = target;
    this.titleEl.textContent = `${target.name} settings`;
    this.draft = {};
    this.renderFields();
    this.backdrop.hidden = false;
  }

  close(): void {
    this.backdrop.hidden = true;
    this.target = null;
    this.callbacks.onClose();
  }

  isOpen(): boolean {
    return !this.backdrop.hidden;
  }

  destroy(): void {
    this.backdrop.remove();
  }

  private currentValue(key: string): IndicatorParamValue {
    if (key in this.draft) return this.draft[key];
    const cur = this.target?.params[key];
    const def = this.target?.defaults[key];
    const val = cur ?? def;
    return val as IndicatorParamValue;
  }

  private setValue(key: string, value: IndicatorParamValue): void {
    if (!this.target) return;
    this.draft[key] = value;
    this.callbacks.onApply(this.target.instanceId, { ...this.draft });
  }

  private resetDefaults(): void {
    if (!this.target) return;
    const reset: Record<string, IndicatorParamValue> = {};
    for (const [key, def] of Object.entries(this.target.defaults)) {
      reset[key] = def as IndicatorParamValue;
    }
    this.draft = reset;
    this.callbacks.onApply(this.target.instanceId, { ...reset });
    this.renderFields();
  }

  private renderFields(): void {
    this.bodyEl.replaceChildren();
    if (!this.target) return;

    const section = document.createElement('div');
    section.className = 'tcw-settings-section';

    const keys = Object.keys(this.target.defaults);
    if (keys.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-settings-label';
      empty.textContent = 'This indicator has no adjustable parameters.';
      section.appendChild(empty);
    }

    for (const key of keys) {
      section.appendChild(this.fieldRow(key));
    }
    this.bodyEl.appendChild(section);
  }

  private fieldRow(key: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row';
    const label = document.createElement('span');
    label.className = 'tcw-settings-label';
    label.textContent = titleCase(key);
    row.appendChild(label);

    const value = this.currentValue(key);
    const defType = typeof (this.target?.defaults[key] ?? value);

    if (defType === 'boolean') {
      row.appendChild(this.toggleControl(key, Boolean(value)));
    } else if (defType === 'number') {
      row.appendChild(this.numberControl(key, Number(value)));
    } else if (typeof value === 'string' && HEX_RE.test(value)) {
      row.appendChild(this.colorControl(key, value));
    } else {
      row.appendChild(this.textControl(key, String(value ?? '')));
    }
    return row;
  }

  private toggleControl(key: string, value: boolean): HTMLButtonElement {
    const toggle = document.createElement('button');
    toggle.className = `tcw-toggle${value ? ' tcw-on' : ''}`;
    toggle.type = 'button';
    toggle.addEventListener('click', () => {
      const next = !toggle.classList.contains('tcw-on');
      toggle.classList.toggle('tcw-on', next);
      this.setValue(key, next);
    });
    return toggle;
  }

  private numberControl(key: string, value: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'tcw-indi-input';
    input.value = String(value);
    // Integer-looking defaults step by 1; fractional defaults step by 0.1.
    input.step = Number.isInteger(value) ? '1' : '0.1';
    input.addEventListener('change', () => {
      const n = Number(input.value);
      if (Number.isFinite(n)) this.setValue(key, n);
    });
    return input;
  }

  private colorControl(key: string, value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'tcw-indi-color';
    input.value = value.length === 4 ? expandHex(value) : value;
    input.addEventListener('input', () => this.setValue(key, input.value));
    return input;
  }

  private textControl(key: string, value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tcw-indi-input';
    input.value = value;
    input.addEventListener('change', () => this.setValue(key, input.value));
    return input;
  }
}

function expandHex(short: string): string {
  // #abc → #aabbcc
  const r = short[1], g = short[2], b = short[3];
  return `#${r}${r}${g}${g}${b}${b}`;
}
