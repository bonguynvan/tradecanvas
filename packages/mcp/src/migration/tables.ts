import tvOptions from './tradingview/options.json';
import tvFeaturesets from './tradingview/featuresets.json';
import tvOverrides from './tradingview/overrides.json';
import tvStudies from './tradingview/studies.json';
import tvDrawings from './tradingview/drawings.json';
import tvApi from './tradingview/api.json';
import lightweight from './lightweight-charts.json';
import type { MigrationEntry, MigrationKind, MigrationTable } from './types.js';
import type { Target } from '../catalog.js';

/** The libraries an app can be moved from. */
export const SOURCES = ['tradingview', 'lightweight-charts'] as const;
export type Source = (typeof SOURCES)[number];

/** What each source's options object makes: TradingView's widget a ChartWidget, Lightweight Charts' chart a Chart. */
export const SOURCE_TARGET: Record<Source, Target> = { tradingview: 'ChartWidget', 'lightweight-charts': 'Chart' };

export const SOURCE_NAMES: Record<Source, string> = {
  tradingview: 'TradingView Advanced Charts / Trading Platform',
  'lightweight-charts': 'TradingView Lightweight Charts',
};

/** A source's tables as one: their entries, and every page they were read from. */
function merge(source: Source, ...parts: unknown[]): MigrationTable {
  const tables = parts as MigrationTable[];
  return {
    source,
    docs: [...new Set(tables.map((t) => t.docs))].join('; '),
    entries: tables.flatMap((t) => t.entries),
  };
}

export const TABLES: Record<Source, MigrationTable> = {
  tradingview: merge('tradingview', tvOptions, tvFeaturesets, tvOverrides, tvStudies, tvDrawings, tvApi),
  'lightweight-charts': merge('lightweight-charts', lightweight),
};

export const sourceOf = (value: unknown): Source | null =>
  value === undefined ? 'tradingview' : SOURCES.includes(value as Source) ? (value as Source) : null;

/** The entries named `name` (case aside), of `kind` when it is given. */
export function findEntries(table: MigrationTable, name: string, kind?: MigrationKind): MigrationEntry[] {
  const lower = name.toLowerCase();
  return table.entries.filter((e) => (!kind || e.kind === kind) && e.name.toLowerCase() === lower);
}

/** The objects the tables name methods on: `chart.createStudy`, `series.setData`. */
const TABLE_RECEIVERS = ['chart', 'series', 'timeScale', 'priceScale'];

/** What code writes before a method's name: `tvWidget.activeChart().createStudy` is `createStudy` on a chart. */
const RECEIVER = /^(?:[\w$]+\.)?(?:activeChart\(\)\.|chart\(\d*\)\.)?/;

/**
 * The entries a name as code writes it means: the name itself, else the
 * method without what it was called on, and that method on each receiver the
 * tables name (`chart.createStudy`, `series.setData`), else the event a
 * `subscribe('event')` names.
 */
export function findByCode(table: MigrationTable, name: string, kind?: MigrationKind): MigrationEntry[] {
  const exact = findEntries(table, name, kind);
  if (exact.length) return exact;
  const called = name.trim().replace(RECEIVER, '');
  const method = called.replace(/\(.*$/s, '');
  const event = /^subscribe\(\s*['"]([\w-]+)['"]/.exec(called)?.[1];
  const wanted = new Set([method, `chart.${method}`, ...(event ? [`subscribe:${event}`] : [])].map((n) => n.toLowerCase()));
  // Only on the objects the tables name methods on: a bare `visible` must not find every `*.visible` key.
  const onReceiver = new Set(TABLE_RECEIVERS.map((r) => `${r}.${method}`.toLowerCase()));
  return table.entries.filter((e) => {
    if (kind && e.kind !== kind) return false;
    const own = e.name.toLowerCase();
    return wanted.has(own) || (e.kind === 'method' && onReceiver.has(own));
  });
}
