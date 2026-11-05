import data from './catalog.json';

/** One input of an indicator, as the widget's settings dialog edits it. */
export interface IndicatorInputEntry {
  /** What kind of value it takes: `'int'` is a whole number. */
  kind: 'int' | 'number' | 'boolean' | 'choice' | 'source' | 'color' | 'text';
  /** Its label in the settings, when the indicator gives one. */
  label?: string;
  /** Its lowest value. */
  min?: number;
  /** Its highest value. */
  max?: number;
  /** How far the settings field moves a number. */
  step?: number;
  /** For a choice: the values to choose from. */
  options?: (string | number)[];
}

/** A built-in indicator: what `chart.addIndicator(id, params)` takes and what it draws. */
export interface IndicatorEntry {
  id: string;
  name: string;
  shortName: string;
  placement: 'overlay' | 'panel';
  /** The group the widget's indicator picker lists it under. */
  category: string;
  params: Record<string, unknown>;
  /** Each input by name: the kind of value it takes and its limits. */
  inputs: Record<string, IndicatorInputEntry>;
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
  /** 'screen': its anchors are shares of the plot (0 to 1 across and down), not times and prices. */
  anchoring?: 'screen';
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
  /**
   * `values` or `items` are the known ones, and others are taken too: a
   * drawing tool's name is a built-in one or a plugin's.
   */
  open?: boolean;
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
// The JSON's inferred type is a union of every entry's own shape, which no longer overlaps the declared one by itself.
export const CATALOG = data as unknown as Catalog;
