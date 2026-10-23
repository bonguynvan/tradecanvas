import data from './catalog.json';

/** A built-in indicator: what `chart.addIndicator(id, params)` takes and what it draws. */
export interface IndicatorEntry {
  id: string;
  name: string;
  shortName: string;
  placement: 'overlay' | 'panel';
  params: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  plots: { key: string; title: string; kind: string }[];
  levels?: number[];
  scale?: unknown;
}

/** A built-in drawing tool: its `type`, and the points (`anchors`) it takes. */
export interface DrawingToolEntry {
  type: string;
  name: string;
  anchors: number;
  creation?: string;
  options?: Record<string, { kind: string; label: string; default: unknown }>;
}

/** One option of an entry point, read from its TypeScript declaration. */
export interface OptionEntry {
  name: string;
  /** The type as written in the declaration. */
  type: string;
  doc?: string;
  /** The only values it takes, when its type is a union of strings or numbers. */
  values?: (string | number)[];
  /** The values each item takes, when it is an array of such a union. */
  items?: (string | number)[];
  /** The one plain kind of value it takes, when it is that simple. */
  kind?: 'boolean' | 'number' | 'string' | 'function';
}

export type Target = 'ChartWidget' | 'Chart' | 'ChartWidgetGrid';
export const TARGETS: readonly Target[] = ['ChartWidget', 'Chart', 'ChartWidgetGrid'];

export interface Catalog {
  indicators: IndicatorEntry[];
  drawingTools: DrawingToolEntry[];
  chartTypes: string[];
  /** The named intervals; `isTimeFrame` also takes any `<n><s|m|h|d|w|M>` and `<n>T`. */
  timeframes: string[];
  widgetFeatures: string[];
  /** Each style key and the kind of value it takes: color, boolean, lineStyle or width. */
  styleKeys: Record<string, string>;
  looks: string[];
  languages: { code: string; name: string; builtIn: boolean }[];
  options: Record<Target, OptionEntry[]>;
  /** Nested option objects, by `<entry>.<option>`: `Chart.features`. */
  nested: Record<string, OptionEntry[]>;
}

/** Generated from the code by scripts/gen-ai-docs.mjs. */
export const CATALOG = data as Catalog;
