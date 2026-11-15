import { resolutionToTimeframe } from '@tradecanvas/commons';
import type { Catalog, Target } from '../catalog.js';
import { validateOptions, type Problem } from '../validate.js';
import { SOURCE_TARGET, TABLES, findEntries, type Source } from './tables.js';
import type { MigrationEntry, MigrationKind, MigrationTarget, ValueTransform } from './types.js';

/** A source setting that needs a call, not an option: what to call, with the value it had. */
export interface MigrationCall {
  /** The source setting, as a path in the object given. */
  from: string;
  /** The TradeCanvas call or member. */
  api: string;
  value: unknown;
  note?: string;
}

/** A source setting with no place in the options. */
export interface Unmapped {
  from: string;
  note: string;
}

export interface Conversion {
  /** The entry point the options are for. */
  target: Target;
  options: Record<string, unknown>;
  /** Settings that are calls after the chart is made. */
  calls: MigrationCall[];
  /** Settings that have no place, each with what to do. */
  unmapped: Unmapped[];
  /** What `validate_options` finds in `options`. */
  problems: Problem[];
  /** Notes on settings that did carry over, where they differ. */
  notes: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Line styles as numbers (0 solid, 1 dotted, 2 dashed; 3 large dashed, 4 sparse dotted) by name. */
const LINE_STYLES = ['solid', 'dotted', 'dashed', 'dashed', 'dotted'] as const;

/** `value` through `transform`; undefined when it can't be read that way. */
function transformValue(value: unknown, transform: ValueTransform = 'same'): unknown {
  switch (transform) {
    case 'same':
      return value;
    case 'lowercase':
      return typeof value === 'string' ? value.toLowerCase() : undefined;
    case 'resolution':
      return typeof value === 'string' || typeof value === 'number' ? (resolutionToTimeframe(String(value)) ?? undefined) : undefined;
    case 'resolutions': {
      if (!Array.isArray(value)) return undefined;
      const timeframes = value.map((v) => resolutionToTimeframe(String(v)));
      return timeframes.every((t) => t !== null) ? timeframes : undefined;
    }
    case 'seconds':
      return typeof value === 'number' && Number.isFinite(value) ? value * 1000 : undefined;
  }
}

/** A style key's value as TradeCanvas takes it: a line style by name, the rest as given. */
function styleValue(kind: string | undefined, value: unknown): unknown {
  if (kind === 'lineStyle' && typeof value === 'number') return LINE_STYLES[value] ?? undefined;
  return value;
}

/** Sets `value` at a dotted `path` under `root`, making the objects on the way. */
function setPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let node = root;
  for (const key of keys.slice(0, -1)) {
    if (!isObject(node[key])) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/** Where style overrides go for an entry point: the widget hands them to its chart. */
const OVERRIDES_PATH: Record<Target, string> = { ChartWidget: 'chartOptions.overrides', Chart: 'overrides', ChartWidgetGrid: 'widget.chartOptions.overrides' };

class Converter {
  readonly result: Conversion;

  constructor(
    private readonly source: Source,
    private readonly catalog: Catalog,
  ) {
    this.result = { target: SOURCE_TARGET[source], options: {}, calls: [], unmapped: [], problems: [], notes: [] };
  }

  /** The source setting at `path` with `value`, through `entry`; `state` is a switch's on/off. */
  apply(path: string, value: unknown, entry: MigrationEntry, state?: boolean): void {
    if (entry.to.length === 0) {
      this.result.unmapped.push({ from: path, note: entry.note ?? 'TradeCanvas has nothing like it.' });
      return;
    }
    let placed = false;
    for (const to of entry.to) placed = this.place(path, value, to, entry, state) || placed;
    if (placed && entry.note) this.result.notes.push(`${path}: ${entry.note}`);
  }

  /** Puts one target in the result; false when the value could not be read for it. */
  private place(path: string, value: unknown, to: MigrationTarget, entry: MigrationEntry, state?: boolean): boolean {
    if ('feature' in to) {
      const on = to.invert ? !state : state;
      // Every switch is on unless set false: only an off one needs writing.
      if (on === false) setPath(this.result.options, `features`, { ...(this.result.options.features as object), [to.feature]: false });
      return true;
    }
    if ('option' in to) {
      const optionPath = to.option.replace(/^(ChartWidget|Chart|ChartWidgetGrid)\./, '');
      let next: unknown;
      // A switch, or a plain option that is a switch: its on or off value, not the value itself.
      const on = state ?? (('on' in to || 'off' in to) && typeof value === 'boolean' ? value : undefined);
      if (on !== undefined) {
        next = on ? to.on : to.off;
        if (next === undefined) return true; // that state is the default: nothing to write
      } else {
        next = transformValue(value, to.transform);
        if (next === undefined) {
          this.result.unmapped.push({ from: path, note: `Its value ${JSON.stringify(value)} could not be read for ${to.option} (${to.transform}). ${entry.note ?? ''}`.trim() });
          return false;
        }
      }
      setPath(this.result.options, optionPath, next);
      return true;
    }
    if ('styleKey' in to) {
      const kind = this.catalog.styleKeys[to.styleKey];
      const next = styleValue(kind, value);
      if (next === undefined) {
        this.result.unmapped.push({ from: path, note: `Its value ${JSON.stringify(value)} is no ${kind} for the style key '${to.styleKey}'.` });
        return false;
      }
      const overridesPath = OVERRIDES_PATH[this.result.target];
      setPath(this.result.options, overridesPath, { ...(readPath(this.result.options, overridesPath) as object), [to.styleKey]: next });
      return true;
    }
    const api = 'api' in to ? to.api : 'indicator' in to ? `chart.addIndicator('${to.indicator}')` : `chart.addDrawing({ type: '${to.drawing}' })`;
    this.result.calls.push({ from: path, api, value, ...(entry.note ? { note: entry.note } : {}) });
    return true;
  }

  lookup(name: string, kind: MigrationKind): MigrationEntry | undefined {
    return findEntries(TABLES[this.source], name, kind)[0];
  }

  unknown(path: string, kind: string): void {
    this.result.unmapped.push({ from: path, note: `Not a known ${kind}: migration_lookup may find it by another spelling.` });
  }
}

function readPath(root: Record<string, unknown>, path: string): unknown {
  let node: unknown = root;
  for (const key of path.split('.')) node = isObject(node) ? node[key] : undefined;
  return node;
}

/** TradingView's widget options: each top-level key, its featuresets, and its overrides. */
function convertTradingView(converter: Converter, options: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(options)) {
    if (key === 'disabled_features' || key === 'enabled_features') {
      const state = key === 'enabled_features';
      for (const name of Array.isArray(value) ? value : []) {
        const path = `${key}[${JSON.stringify(name)}]`;
        const entry = typeof name === 'string' ? converter.lookup(name, 'featureset') : undefined;
        if (entry) converter.apply(path, state, entry, state);
        else converter.unknown(path, 'featureset');
      }
      continue;
    }
    if (key === 'datafeed') {
      // The datafeed stays as it is, behind the bridge.
      const code = typeof value === 'string' && value.trim() ? value.trim() : 'datafeed';
      converter.result.options.feed = `feedFromJsApi(${code})`;
      converter.result.notes.push("datafeed: kept as it is behind feedFromJsApi (import { feedFromJsApi } from '@tradecanvas/chart'); a UDF server's datafeed becomes udfFeed({ url }). Make the feed first and await feed.ready() before new ChartWidget, so the chart knows the timeframes it serves.");
      continue;
    }
    if (key === 'overrides' && isObject(value)) {
      for (const [name, v] of Object.entries(value)) {
        const entry = converter.lookup(name, 'override');
        if (entry) converter.apply(`overrides[${JSON.stringify(name)}]`, v, entry);
        else converter.unknown(`overrides[${JSON.stringify(name)}]`, 'override key');
      }
      continue;
    }
    const entry = converter.lookup(key, 'option');
    if (entry) converter.apply(key, value, entry);
    else converter.unknown(key, 'widget option');
  }
}

/** Lightweight Charts' options are nested: the deepest path the table names takes its value. */
function convertNested(converter: Converter, options: Record<string, unknown>, prefix = ''): void {
  for (const [key, value] of Object.entries(options)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const entry = converter.lookup(path, 'option');
    if (entry) converter.apply(path, value, entry);
    else if (isObject(value)) convertNested(converter, value, path);
    else converter.unknown(path, 'chart option');
  }
}

/**
 * The options a source's options object becomes, the calls the rest become,
 * and what has no place, each with what to do instead; then checked as
 * `validate_options` checks them.
 */
export function convertOptions(source: Source, options: unknown, catalog: Catalog): Conversion {
  const converter = new Converter(source, catalog);
  if (!isObject(options)) {
    converter.result.unmapped.push({ from: '(options)', note: 'Give the options as a JSON object.' });
    return converter.result;
  }
  if (source === 'tradingview') convertTradingView(converter, options);
  else convertNested(converter, options);
  const validation = validateOptions(converter.result.target, converter.result.options, catalog);
  converter.result.problems = validation.problems;
  converter.result.notes.push(...validation.notes);
  return converter.result;
}
