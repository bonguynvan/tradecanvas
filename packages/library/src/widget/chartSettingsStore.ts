import { isValidTimeZone, readChartTypeOptions } from '@tradecanvas/commons';
import type { KeyValueStorage } from './DrawingTemplateStore.js';
import type { ChartSettingsState } from './types.js';
import { DEFAULT_SETTINGS } from './widgetConfig.js';

type SettingsKey = keyof ChartSettingsState;

/** Where `persistSettings` keeps the settings unless it names a key. */
export const DEFAULT_SETTINGS_KEY = 'tcw:chart-settings';
/** The version of what `persistSettings` writes. */
const STORE_VERSION = 1;

/**
 * Never kept: the log flag follows the scale mode, and auto-scale goes off
 * with a drag on the axis and back on with a double-click.
 */
const NEVER_KEPT: readonly SettingsKey[] = ['logScale', 'autoScale'];
/** The viewer's own: a layout or a link from someone else leaves them as they are. */
export const VIEWER_KEYS: ReadonlySet<SettingsKey> = new Set<SettingsKey>(['timezone', 'numberLocale']);
/**
 * What `persistSettings` leaves out: besides the flags never kept, a chart
 * type's own settings, which are the chart's state (a layout loaded puts
 * its own in their place).
 */
export const PERSIST_LEAVES: ReadonlySet<SettingsKey> = new Set<SettingsKey>([...NEVER_KEPT, 'chartTypeOptions']);
/**
 * What a layout's or a shared link's `settings` leaves out: the viewer's own,
 * the scale and its flip (fields of their own there), and a chart type's own
 * settings (in the chart's state).
 */
export const LAYOUT_LEAVES: ReadonlySet<SettingsKey> = new Set<SettingsKey>([
  ...NEVER_KEPT, ...VIEWER_KEYS, 'scaleMode', 'invertScale', 'chartTypeOptions',
]);
/** Nothing left out: every setting of the right kind. */
export const ALL_SETTINGS: ReadonlySet<SettingsKey> = new Set<SettingsKey>();

/** The choices a setting takes, where it is one of a few words. */
const CHOICES: Partial<Record<SettingsKey, readonly string[]>> = {
  crosshairMode: ['normal', 'magnet', 'hidden'],
  scaleMode: ['regular', 'logarithmic', 'percentage', 'indexedTo100'],
  periodLevelsPeriod: ['day', 'week'],
};

/** The numbers' ranges, as the settings' sliders offer them; `whole` ones are counts. */
const RANGES: Partial<Record<SettingsKey, { min: number; max: number; whole?: boolean }>> = {
  marketProfileBuckets: { min: 8, max: 200, whole: true },
  marketProfileOpacity: { min: 0.05, max: 1 },
  depthHeatmapOpacity: { min: 0.1, max: 1 },
  pivotStrength: { min: 2, max: 20, whole: true },
};

/** A fixed offset in minutes, as older settings wrote one. */
const MINUTES = /^-?\d+$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A time zone the chart can show: the browser's, the symbol's, a fixed offset, or a zone this browser knows. */
function isZoneSetting(value: string): boolean {
  return value === 'local' || value === 'exchange' || MINUTES.test(value) || isValidTimeZone(value);
}

/** A number format this browser can write (an unknown tag would throw when the chart formats a price). */
function isNumberLocale(value: string): boolean {
  try {
    return Intl.NumberFormat.supportedLocalesOf(value).length > 0;
  } catch {
    return false;
  }
}

/** One setting as read, of the kind its default is and in its range; undefined when it isn't one. */
function readSetting(key: SettingsKey, value: unknown): unknown {
  const def = DEFAULT_SETTINGS[key];
  if (key === 'chartTypeOptions') return isObject(value) ? readChartTypeOptions(value) : undefined;
  if (typeof value !== typeof def) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    const range = RANGES[key];
    if (!range) return value;
    const clamped = Math.min(range.max, Math.max(range.min, value));
    return range.whole ? Math.round(clamped) : clamped;
  }
  if (typeof value !== 'string') return value;
  const choices = CHOICES[key];
  if (choices) return choices.includes(value) ? value : undefined;
  if (key === 'timezone') return isZoneSetting(value) ? value : undefined;
  if (key === 'numberLocale') return isNumberLocale(value) ? value : undefined;
  return value;
}

/**
 * Chart Settings read from anywhere (storage, a layout, a link, a host's
 * call): only the known keys, each of its kind, numbers in the settings'
 * ranges, a time zone and a number format this browser knows. `leave` names
 * the keys not to take.
 */
export function readChartSettings(raw: unknown, leave: ReadonlySet<SettingsKey> = ALL_SETTINGS): Partial<ChartSettingsState> {
  if (!isObject(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingsKey[]) {
    if (leave.has(key) || !Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const value = readSetting(key, raw[key]);
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<ChartSettingsState>;
}

/** Every setting but those in `leave`. */
export function pickSettings(settings: ChartSettingsState, leave: ReadonlySet<SettingsKey>): Partial<ChartSettingsState> {
  return Object.fromEntries((Object.keys(settings) as SettingsKey[])
    .filter((key) => !leave.has(key))
    .map((key) => [key, settings[key]])) as Partial<ChartSettingsState>;
}

/** The settings that differ from `base`, but those in `leave`. */
export function settingsDelta(settings: ChartSettingsState, base: ChartSettingsState, leave: ReadonlySet<SettingsKey>): Partial<ChartSettingsState> {
  return Object.fromEntries((Object.keys(settings) as SettingsKey[])
    .filter((key) => !leave.has(key) && JSON.stringify(settings[key]) !== JSON.stringify(base[key]))
    .map((key) => [key, settings[key]])) as Partial<ChartSettingsState>;
}

/** The key `persistSettings` names; null when it is off. */
export function settingsStoreKey(option: boolean | { key?: string } | undefined): string | null {
  if (!option) return null;
  return (option === true ? undefined : option.key) || DEFAULT_SETTINGS_KEY;
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * The Chart Settings a user changed, kept in this browser's storage under one
 * key (`persistSettings`). What is read back is checked; what can't be read
 * is left out.
 */
export class ChartSettingsStore {
  constructor(
    private readonly key: string,
    private readonly storage: KeyValueStorage | null = defaultStorage(),
  ) {}

  /** What was kept; nothing when nothing readable was. */
  load(): Partial<ChartSettingsState> {
    let raw: unknown;
    try {
      raw = JSON.parse(this.storage?.getItem(this.key) ?? 'null');
    } catch {
      return {};
    }
    if (!isObject(raw) || raw.v !== STORE_VERSION) return {};
    return readChartSettings(raw.settings, PERSIST_LEAVES);
  }

  /** Keep what differs from `defaults` (the host's), so a default the host changes later still reaches a user who never touched it. */
  save(settings: ChartSettingsState, defaults: ChartSettingsState): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify({ v: STORE_VERSION, settings: settingsDelta(settings, defaults, PERSIST_LEAVES) }));
    } catch {
      // Storage full or blocked: the settings still apply, only not on the next visit.
    }
  }
}
