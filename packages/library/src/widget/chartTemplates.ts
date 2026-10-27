import { readChartStyleOverrides } from '@tradecanvas/commons';
import type { KeyValueStorage } from './DrawingTemplateStore.js';
import type { ChartSettingsState, SettingsStylePatch } from './types.js';
import { readChartSettings } from './chartSettingsStore.js';
import { SETTINGS_LOOK_KEYS } from './widgetSettingsLook.js';

/** A chart's look under a name: the settings' switches, and the colours, dashes and widths. */
export interface ChartTemplate {
  name: string;
  settings: Partial<ChartSettingsState>;
  style: SettingsStylePatch;
}

/**
 * What a template leaves out: the user's own (the time zone, the number
 * format), a type's own, a flag kept with the scale mode, and auto-scale,
 * which a drag on the axis turns off and a double-click back on.
 */
const NOT_LOOK = new Set<keyof ChartSettingsState>(['timezone', 'numberLocale', 'chartTypeOptions', 'logScale', 'autoScale']);
/** The longest name kept: as long as the name prompt takes. */
const MAX_NAME = 80;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The settings a template keeps, of the kind each takes. */
export function templateSettings(raw: unknown): Partial<ChartSettingsState> {
  return readChartSettings(raw, NOT_LOOK);
}

/** The style a template keeps: the settings' own keys that are set, of the kind each takes. */
function templateStyle(raw: unknown): SettingsStylePatch {
  const { overrides } = readChartStyleOverrides(raw);
  return Object.fromEntries(Object.entries(overrides)
    .filter(([key, value]) => value !== null && (SETTINGS_LOOK_KEYS as readonly string[]).includes(key))) as SettingsStylePatch;
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Chart templates kept in this browser's storage, by name. What is read back
 * is checked; what can't be read is left out.
 */
export class ChartTemplateStore {
  constructor(
    private readonly key = 'tcw:chart-templates',
    private readonly storage: KeyValueStorage | null = defaultStorage(),
  ) {}

  /** Every template, by name. */
  list(): ChartTemplate[] {
    let raw: unknown;
    try {
      raw = JSON.parse(this.storage?.getItem(this.key) ?? '[]');
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) return [];
    const out: ChartTemplate[] = [];
    for (const entry of raw) {
      if (!isObject(entry) || typeof entry.name !== 'string' || !entry.name.trim()) continue;
      out.push({ name: entry.name.slice(0, MAX_NAME).trim(), settings: templateSettings(entry.settings), style: templateStyle(entry.style) });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  get(name: string): ChartTemplate | null {
    return this.list().find((t) => t.name === name) ?? null;
  }

  /** Keep the look under `name`, in place of one of that name. False when storage refuses. */
  save(name: string, settings: ChartSettingsState, style: SettingsStylePatch): boolean {
    const clean = name.replace(/\s+/g, ' ').slice(0, MAX_NAME).trim();
    if (!clean || !this.storage) return false;
    const next = [...this.list().filter((t) => t.name !== clean), { name: clean, settings: templateSettings(settings), style: templateStyle(style) }];
    try {
      this.storage.setItem(this.key, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }

  remove(name: string): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.list().filter((t) => t.name !== name)));
    } catch {
      // Storage unavailable: nothing was kept to remove.
    }
  }
}
