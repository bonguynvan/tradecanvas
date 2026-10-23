import { CATALOG, TARGETS, type Catalog, type IndicatorEntry, type OptionEntry, type Target } from './catalog.js';
import { closest } from './similar.js';
import { validateOptions } from './validate.js';

/** What a tool answers: data for clients that read structured content, and the same as text for the rest. */
export interface ToolResult {
  text: string;
  data: unknown;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
  run(args: Record<string, unknown>, catalog: Catalog): ToolResult;
}

/** Compact JSON: the text goes into the agent's context next to the same data. */
const ok = (data: unknown): ToolResult => ({ text: JSON.stringify(data), data });
const fail = (message: string, data: Record<string, unknown> = {}): ToolResult => ({ text: message, data: { error: message, ...data }, isError: true });

const text = (args: Record<string, unknown>, key: string): string | undefined =>
  typeof args[key] === 'string' && (args[key] as string).trim() ? (args[key] as string).trim() : undefined;

/** Every word of the query in one of the fields, case aside: `bollinger width` finds `bbw`. */
function matches(query: string | undefined, ...fields: string[]): boolean {
  if (!query) return true;
  const haystack = fields.join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).every((word) => haystack.includes(word));
}

const TARGET_SCHEMA = { type: 'string', enum: [...TARGETS], description: 'The entry point: ChartWidget (the full trading UI), Chart (the headless chart) or ChartWidgetGrid (several charts).' };

function targetOf(args: Record<string, unknown>): Target | null {
  return TARGETS.includes(args.target as Target) ? (args.target as Target) : null;
}

/** The indicators a name means: its id exactly, else every one it is the id, short name or name of (case aside). */
function findIndicators(catalog: Catalog, wanted: string): IndicatorEntry[] {
  const exact = catalog.indicators.find((i) => i.id === wanted);
  if (exact) return [exact];
  const lower = wanted.toLowerCase();
  return catalog.indicators.filter((i) => i.id.toLowerCase() === lower || i.shortName.toLowerCase() === lower || i.name.toLowerCase() === lower);
}

/** How to add an indicator and read its lines, with its real id, defaults and line keys. */
function indicatorUsage(i: IndicatorEntry): string {
  const value = (v: unknown) => JSON.stringify(v).replace(/"/g, "'");
  const entries = Object.entries(i.params);
  const params = entries.length ? `, { ${entries.map(([k, v]) => `${k}: ${value(v)}`).join(', ')} }` : '';
  const pane = i.placement === 'panel' ? " // in a pane of its own; addIndicator(id, params, 'top') puts it above" : ' // over the candles, on the price scale';
  const keys = i.plots.map((p) => p.key);
  // addIndicator returns null when indicators are switched off, and a series can be empty: strict TypeScript wants both handled.
  const read = keys.length
    ? `\nif (instanceId) {\n  const series = chart.getIndicatorOutput(instanceId)?.series ?? [];\n  console.log(series[series.length - 1]?.${keys[0]}); // the last bar's value; lines: ${keys.join(', ')}\n}`
    : '';
  return `const instanceId = chart.addIndicator('${i.id}'${params});${pane}${read}`;
}

/** The known intervals and languages go with the options that take them, as their values. */
function withKnownValues(catalog: Catalog, option: OptionEntry): OptionEntry & { note?: string } {
  const note = 'Also any <n><s|m|h|d|w|M> (7m, 90m) and <n>T for tick bars (100T).';
  const type = option.type.replace(/^readonly /, '');
  if (type === 'TimeFrame') return { ...option, values: catalog.timeframes, note };
  if (type === 'TimeFrame[]') return { ...option, items: catalog.timeframes, note };
  if (option.name === 'locale' && option.kind === 'string') {
    return { ...option, values: catalog.languages.map((l) => l.code), note: "'en' and 'vi' are built in; call registerWidgetLocales() from '@tradecanvas/chart/widget/locales' for the others." };
  }
  if (option.name === 'ui') return { ...option, values: catalog.looks, note: 'Or a look object over one of them.' };
  return option;
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: 'list_indicators',
    title: 'List built-in indicators',
    description: 'Lists the built-in indicators with their ids, names and where they draw (overlay: on the price pane; panel: in a pane of their own). Search by words of the id or name ("moving average", "bollinger"). Use the id with chart.addIndicator(id, params); get_indicator has the params and line keys.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to find in the id, short name or name.' },
        placement: { type: 'string', enum: ['overlay', 'panel'], description: 'Only those on the price pane, or only those in a pane of their own.' },
      },
      additionalProperties: false,
    },
    run(args, catalog) {
      const query = text(args, 'query');
      const indicators = catalog.indicators
        .filter((i) => !args.placement || i.placement === args.placement)
        .filter((i) => matches(query, i.id, i.shortName, i.name))
        .map((i) => ({ id: i.id, name: i.name, placement: i.placement }));
      return ok({ count: indicators.length, indicators });
    },
  },
  {
    name: 'get_indicator',
    title: 'Get an indicator',
    description: 'One built-in indicator in full: its default params (what addIndicator takes), its inputs, its lines (the keys getIndicatorOutput returns per bar, which are often not the indicator id: RSI\'s line is `value`), its levels, and code that adds it and reads it. Takes the id, the short name or the full name.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: "The indicator's id ('rsi', 'bb'), short name or name." } },
      required: ['id'],
      additionalProperties: false,
    },
    run(args, catalog) {
      const wanted = text(args, 'id');
      if (!wanted) return fail('Give the indicator id, e.g. { "id": "rsi" }.');
      const found = findIndicators(catalog, wanted);
      if (found.length === 1) return ok({ ...found[0], usage: indicatorUsage(found[0]) });
      if (found.length > 1) {
        const ids = found.map((i) => i.id);
        return fail(`'${wanted}' names ${found.map((i) => `'${i.id}' (${i.name})`).join(' and ')}: ask by id.`, { suggestions: ids });
      }
      const ids = catalog.indicators.map((i) => i.id);
      const suggestions = [...new Set([...closest(wanted, ids), ...catalog.indicators.filter((i) => matches(wanted, i.id, i.shortName, i.name)).map((i) => i.id)])].slice(0, 5);
      return fail(`No indicator '${wanted}'.${suggestions.length ? ` Did you mean ${suggestions.map((s) => `'${s}'`).join(', ')}?` : ''} list_indicators lists them.`, { suggestions });
    },
  },
  {
    name: 'list_drawing_tools',
    title: 'List drawing tools',
    description: 'Lists the built-in drawing tools: the `type` that chart.addDrawing and chart.setDrawingTool take, the number of points (anchors) each needs, how the pointer draws it, and the options it offers. Search by words of the type or name ("fib", "channel").',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Words to find in the type or name.' } },
      additionalProperties: false,
    },
    run(args, catalog) {
      const query = text(args, 'query');
      const tools = catalog.drawingTools.filter((t) => matches(query, t.type, t.name));
      return ok({
        count: tools.length,
        tools,
        usage: "chart.addDrawing({ type: 'trendLine', anchors: [{ time, price }, { time, price }], options: { extendRight: true } }); // as many anchors as the tool's `anchors`\nchart.setDrawingTool('trendLine'); // or let the user draw it",
      });
    },
  },
  {
    name: 'list_options',
    title: 'List the options of an entry point',
    description: 'Lists the options that new ChartWidget(el, options), new Chart(el, options) or new ChartWidgetGrid(el, options) take: each name, its TypeScript type, its doc, and the values it allows where it allows only some. Search by words of the name or doc.',
    inputSchema: {
      type: 'object',
      properties: {
        target: TARGET_SCHEMA,
        query: { type: 'string', description: 'Words to find in the option name or doc.' },
      },
      required: ['target'],
      additionalProperties: false,
    },
    run(args, catalog) {
      const target = targetOf(args);
      if (!target) return fail(`'target' is one of ${TARGETS.join(', ')}.`);
      const query = text(args, 'query');
      const options = catalog.options[target]
        .filter((o) => matches(query, o.name, o.doc ?? ''))
        .map((o) => withKnownValues(catalog, o));
      return ok({ target, count: options.length, options });
    },
  },
  {
    name: 'list_widget_features',
    title: 'List ChartWidget feature switches',
    description: "Lists the names ChartWidget's `features` option takes (every switch is on unless set false). A name without a dot turns a whole capability off ('alerts', 'hotkeys'); a dotted name, one place ('toolbar.screenshot', 'menu.chart.settings'). Narrow by a prefix.",
    inputSchema: {
      type: 'object',
      properties: { prefix: { type: 'string', description: "Only names starting with this, e.g. 'toolbar.' or 'menu.'." } },
      additionalProperties: false,
    },
    run(args, catalog) {
      const prefix = text(args, 'prefix') ?? '';
      const features = catalog.widgetFeatures.filter((f) => f.startsWith(prefix));
      return ok({ count: features.length, features, usage: "new ChartWidget(el, { features: { 'toolbar.screenshot': false, alerts: false } })" });
    },
  },
  {
    name: 'list_style_keys',
    title: 'List chart style keys',
    description: "Lists the style keys of the chart's look and the kind of value each takes (color, boolean, lineStyle: 'solid' | 'dashed' | 'dotted', width: pixels up to 20). They go in Chart's `overrides` option or chart.applyOverrides({...}). Narrow by a prefix such as 'grid.' or 'series.candlestick.'.",
    inputSchema: {
      type: 'object',
      properties: { prefix: { type: 'string', description: "Only keys starting with this, e.g. 'grid.' or 'crosshair.'." } },
      additionalProperties: false,
    },
    run(args, catalog) {
      const prefix = text(args, 'prefix') ?? '';
      const keys = Object.fromEntries(Object.entries(catalog.styleKeys).filter(([key]) => key.startsWith(prefix)));
      return ok({ count: Object.keys(keys).length, keys, usage: "chart.applyOverrides({ 'grid.vertical.visible': false, 'series.candlestick.upColor': '#26a69a' })" });
    },
  },
  {
    name: 'validate_options',
    title: 'Check an options object',
    description: 'Checks an options object before it goes to new ChartWidget, new Chart or new ChartWidgetGrid: unknown option names (with the one likely meant, and where an option of another entry point belongs), values outside the allowed ones, numbers given as strings, intervals, feature switch names, style override keys and values, and languages, nested options included. Write functions and adapters as strings; they pass.',
    inputSchema: {
      type: 'object',
      properties: {
        target: TARGET_SCHEMA,
        // Any keys: the tool says which are wrong. An empty `properties` keeps strict schema readers content.
        options: { type: 'object', properties: {}, additionalProperties: true, description: 'The options object, as JSON.' },
      },
      required: ['target', 'options'],
      additionalProperties: false,
    },
    run(args, catalog) {
      const target = targetOf(args);
      if (!target) return fail(`'target' is one of ${TARGETS.join(', ')}.`);
      const result = validateOptions(target, args.options, catalog);
      const lines = result.valid ? ['No problems found.'] : result.problems.map((p) => `- ${p.path || '(options)'}: ${p.message}${p.suggestion ? ` Did you mean '${p.suggestion}'?` : ''}`);
      return { text: [...lines, ...result.notes.map((n) => `Note: ${n}`)].join('\n'), data: result };
    },
  },
];

/** Runs a tool by name. Bad arguments come back as a tool error the agent can read and fix. */
export function runTool(name: string, args: Record<string, unknown>, catalog: Catalog = CATALOG): ToolResult {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return fail(`No tool '${name}'.`);
  return tool.run(args, catalog);
}
