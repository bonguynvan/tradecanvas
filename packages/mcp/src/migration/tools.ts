import { resolutionToTimeframe } from '@tradecanvas/commons';
import type { Catalog } from '../catalog.js';
import type { ToolDefinition, ToolResult } from '../tools.js';
import { closest } from '../similar.js';
import { convertOptions } from './convert.js';
import { PLANS } from './plan.js';
import { SOURCES, SOURCE_NAMES, TABLES, findByCode, findEntries, sourceOf, type Source } from './tables.js';
import type { MigrationEntry, MigrationKind, MigrationTarget } from './types.js';

const ok = (data: unknown): ToolResult => ({ text: JSON.stringify(data), data });
const fail = (message: string, data: Record<string, unknown> = {}): ToolResult => ({ text: message, data: { error: message, ...data }, isError: true });

const KINDS: readonly MigrationKind[] = ['option', 'featureset', 'override', 'study', 'drawing', 'method', 'datafeed', 'broker'];
/** Most entries a search lists. */
const SEARCH_LIMIT = 40;

const SOURCE_SCHEMA = {
  type: 'string',
  enum: [...SOURCES],
  description: "The library the app uses now: 'tradingview' (Advanced Charts, Trading Platform; the default) or 'lightweight-charts'.",
};

const KIND_SCHEMA = {
  type: 'string',
  enum: [...KINDS, 'resolution'],
  description:
    "What the name is: a widget 'option', a 'featureset', an 'override' key, a 'study' (indicator), a 'drawing' (shape name), a 'method' of the widget or a chart, a 'datafeed' or 'broker' member, or a 'resolution' ('60', '1D').",
};

const noSource = (): ToolResult => fail(`'source' is one of ${SOURCES.join(', ')}.`);

/** A target with what the catalog knows of it, so the answer can be used as it is. */
function describe(to: MigrationTarget, catalog: Catalog): Record<string, unknown> {
  if ('indicator' in to) {
    const ind = catalog.indicators.find((i) => i.id === to.indicator);
    return {
      ...to,
      name: ind?.name,
      defaults: ind?.params,
      lines: ind?.plots.map((p) => p.key),
      usage: `chart.addIndicator('${to.indicator}', { ... })`,
      // The docs name inputs one way; code often passes them as in_0, in_1… in the dialog's order.
      ...(to.params ? { paramsNote: "`params` maps the inputs as TradingView's docs name them; code that passes in_0, in_1… gives them in the settings dialog's order: match them by meaning and value." } : {}),
    };
  }
  if ('drawing' in to) {
    const tool = catalog.drawingTools.find((t) => t.type === to.drawing);
    return { ...to, anchors: tool?.anchors, usage: `chart.addDrawing({ type: '${to.drawing}', anchors: [{ time /* ms */, price }] })` };
  }
  if ('feature' in to) return { ...to, usage: `new ChartWidget(el, { features: { '${to.feature}': false } })` };
  if ('styleKey' in to) return { ...to, valueKind: catalog.styleKeys[to.styleKey], usage: `chart.applyOverrides({ '${to.styleKey}': value })` };
  if ('option' in to) {
    const [target, ...rest] = to.option.split('.');
    const options = catalog.options[target as keyof Catalog['options']];
    const option = rest.length === 1 ? options?.find((o) => o.name === rest[0]) : catalog.nested[`${target}.${rest[0]}`]?.find((o) => o.name === rest[1]);
    return option ? { ...to, type: option.type, doc: option.doc } : { ...to };
  }
  return { ...to };
}

const answer = (entry: MigrationEntry, catalog: Catalog) => ({
  kind: entry.kind,
  name: entry.name,
  equivalent: entry.to.length > 0,
  to: entry.to.map((t) => describe(t, catalog)),
  ...(entry.note ? { note: entry.note } : {}),
});

function lookup(source: Source, args: Record<string, unknown>, catalog: Catalog): ToolResult {
  const table = TABLES[source];
  const kind = typeof args.kind === 'string' ? args.kind : undefined;
  if (kind !== undefined && kind !== 'resolution' && !KINDS.includes(kind as MigrationKind)) {
    return fail(`'kind' is one of ${[...KINDS, 'resolution'].join(', ')}.`);
  }
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';

  if (name) {
    if (kind === 'resolution' || (!kind && /^\d+[A-Z]?$|^[DWM]$/.test(name) && !findEntries(table, name).length)) {
      const timeframe = resolutionToTimeframe(name);
      return timeframe
        ? ok({ kind: 'resolution', name, equivalent: true, to: [{ timeframe }], note: 'TradeCanvas names intervals as a count and a unit: s, m, h, d, w, M; tick bars as 100T.' })
        : fail(`'${name}' is no resolution: a number of minutes, or a count and S, T, D, W or M ('15S', '1D').`);
    }
    const found = findByCode(table, name, kind as MigrationKind | undefined);
    if (found.length) return ok({ source, count: found.length, entries: found.map((e) => answer(e, catalog)) });
    const pool = table.entries.filter((e) => !kind || e.kind === kind);
    const suggestions = closest(name, [...new Set(pool.map((e) => e.name))], 5);
    return fail(
      `No ${kind ?? 'name'} '${name}' in the ${SOURCE_NAMES[source]} table.${suggestions.length ? ` Did you mean ${suggestions.map((s) => `'${s}'`).join(', ')}?` : ''} Search with 'query'.`,
      { suggestions },
    );
  }

  const words = query.split(/\s+/).filter(Boolean);
  const matched = table.entries
    .filter((e) => !kind || e.kind === kind)
    .filter((e) => words.every((w) => `${e.name} ${e.note ?? ''} ${JSON.stringify(e.to)}`.toLowerCase().includes(w)));
  return ok({
    source,
    count: matched.length,
    entries: matched.slice(0, SEARCH_LIMIT).map((e) => ({ kind: e.kind, name: e.name, to: e.to, ...(e.note ? { note: e.note } : {}) })),
    ...(matched.length > SEARCH_LIMIT ? { more: matched.length - SEARCH_LIMIT } : {}),
  });
}

export const MIGRATION_TOOLS: readonly ToolDefinition[] = [
  {
    name: 'migration_plan',
    title: 'Plan a move from TradingView',
    description:
      "How to move an app from TradingView's Advanced Charts / Trading Platform (the charting library) or from Lightweight Charts to TradeCanvas: the steps in order, what to search the app's code for and which tool maps what each search finds, and what to check at the end. Call it first.",
    inputSchema: { type: 'object', properties: { source: SOURCE_SCHEMA }, additionalProperties: false },
    run(args) {
      const source = sourceOf(args.source);
      if (!source) return noSource();
      const table = TABLES[source];
      const counts = Object.fromEntries(KINDS.map((k) => [k, table.entries.filter((e) => e.kind === k).length]).filter(([, n]) => n));
      return ok({ ...PLANS[source], from: SOURCE_NAMES[source], table: { entries: counts, docs: table.docs } });
    },
  },
  {
    name: 'migration_lookup',
    title: 'Look up a TradingView name',
    description:
      "What a name of TradingView's charting library (Advanced Charts, Trading Platform) or Lightweight Charts becomes in TradeCanvas: a widget option, featureset, override key, study, drawing shape, widget or chart method, datafeed or broker member, or a resolution. Gives the TradeCanvas option, feature switch, style key, indicator id (with its defaults and line keys), drawing type (with its anchors) or call, and says plainly when there is no equivalent and what to do instead. Look up one name with 'name', or search the table with 'query'.",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "The name as the old library spells it: 'header_widget', 'paneProperties.background', 'Relative Strength Index', 'trend_line', 'createStudy', 'getBars', '60'." },
        kind: KIND_SCHEMA,
        query: { type: 'string', description: "Words to find in the table's names, targets and notes, when there is no exact name: 'volume', 'legend'." },
        source: SOURCE_SCHEMA,
      },
      additionalProperties: false,
    },
    run(args, catalog) {
      const source = sourceOf(args.source);
      if (!source) return noSource();
      if (!args.name && !args.query) return fail("Give a 'name' to look up, or a 'query' to search for.");
      return lookup(source, args, catalog);
    },
  },
  {
    name: 'convert_widget_options',
    title: 'Convert TradingView widget options',
    description:
      "Turns the options object of TradingView's widget (new TradingView.widget({...}): its options, disabled_features / enabled_features and overrides) into ChartWidget options, or Lightweight Charts' createChart options into Chart options. Returns the options, the calls to make once the chart exists, what has no place (each with what to do), and what validate_options finds in the result. Write functions and other code as strings; they are carried as they are.",
    inputSchema: {
      type: 'object',
      properties: {
        options: { type: 'object', properties: {}, additionalProperties: true, description: 'The old options object, as JSON.' },
        source: SOURCE_SCHEMA,
      },
      required: ['options'],
      additionalProperties: false,
    },
    run(args, catalog) {
      const source = sourceOf(args.source);
      if (!source) return noSource();
      return ok(convertOptions(source, args.options, catalog));
    },
  },
];
