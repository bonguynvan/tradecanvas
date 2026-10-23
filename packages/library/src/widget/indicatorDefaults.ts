import type { IndicatorStyleConfig } from '@tradecanvas/commons';
import { parseIndicatorSource, readIndicatorPlotStyles } from '@tradecanvas/commons';
import type { KeyValueStorage } from './DrawingTemplateStore.js';
import type { IndicatorDefault, IndicatorParamValue } from './WidgetIndicatorSettings.js';

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The inputs a saved default can hold: numbers, words and switches; not a line of another indicator. */
function readParams(raw: unknown): Record<string, IndicatorParamValue> {
  if (!isObject(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, v]) =>
    (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && !parseIndicatorSource(v)) || typeof v === 'boolean')) as Record<string, IndicatorParamValue>;
}

function readStyle(raw: unknown): IndicatorStyleConfig {
  if (!isObject(raw)) return {};
  const style: IndicatorStyleConfig = {};
  if (Array.isArray(raw.colors)) {
    const colors = raw.colors.filter((c): c is string => typeof c === 'string' && c.trim() !== '');
    if (colors.length > 0) style.colors = colors;
  }
  if (Array.isArray(raw.lineWidths)) {
    const widths = raw.lineWidths.filter((w): w is number => typeof w === 'number' && Number.isFinite(w) && w > 0);
    if (widths.length > 0) style.lineWidths = widths;
  }
  const plots = readIndicatorPlotStyles(raw.plots);
  if (plots) style.plots = plots;
  return style;
}

/**
 * What "Save as default" keeps for each kind of indicator, in this
 * browser's storage: the inputs a new one starts with, and its look. What is
 * read back is checked; what can't be read is left out.
 */
export class IndicatorDefaultsStore {
  constructor(
    private readonly key = 'tcw:indicator-defaults',
    private readonly storage: KeyValueStorage | null = defaultStorage(),
  ) {}

  /** Every kind with a saved default. */
  all(): Map<string, IndicatorDefault> {
    const out = new Map<string, IndicatorDefault>();
    let raw: unknown;
    try {
      raw = JSON.parse(this.storage?.getItem(this.key) ?? '{}');
    } catch {
      return out;
    }
    if (!isObject(raw)) return out;
    for (const [id, entry] of Object.entries(raw)) {
      if (isObject(entry)) out.set(id, { params: readParams(entry.params), style: readStyle(entry.style) });
    }
    return out;
  }

  get(id: string): IndicatorDefault | null {
    return this.all().get(id) ?? null;
  }

  /** Keep `saved` for kind `id`, in place of what it had. False when storage refuses. */
  save(id: string, saved: IndicatorDefault): boolean {
    if (!this.storage) return false;
    const next = Object.fromEntries([...this.all(), [id, { params: readParams(saved.params), style: readStyle(saved.style) }]]);
    try {
      this.storage.setItem(this.key, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }
}
