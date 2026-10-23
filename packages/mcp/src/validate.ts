import { isTimeFrame, readChartStyleOverrides, tickBarCount } from '@tradecanvas/commons';
import { CATALOG, TARGETS, type Catalog, type OptionEntry, type Target } from './catalog.js';
import { closest } from './similar.js';

export interface Problem {
  /** Where, as `chartOptions.renderer` or `cells[1].symbol`; '' for the object itself. */
  path: string;
  message: string;
  /** The name or value that was most likely meant. */
  suggestion?: string;
}

export interface Validation {
  valid: boolean;
  problems: Problem[];
  /** Things that work, but need one more step. */
  notes: string[];
}

interface Context {
  catalog: Catalog;
  problems: Problem[];
  notes: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const quoted = (values: readonly (string | number)[]) => values.map((v) => (typeof v === 'number' ? String(v) : `'${v}'`)).join(', ');
const strings = (values: readonly (string | number)[]) => values.filter((v): v is string => typeof v === 'string');
const at = (path: string, key: string) => (path ? `${path}.${key}` : key);

function problem(ctx: Context, path: string, message: string, candidates: readonly string[] = [], typed?: unknown): void {
  const suggestion = typeof typed === 'string' ? closest(typed, candidates)[0] : undefined;
  ctx.problems.push(suggestion ? { path, message, suggestion } : { path, message });
}

/** Where an option of another entry point goes instead. */
const ELSEWHERE: Record<Target, Partial<Record<Target, string>>> = {
  ChartWidget: { Chart: 'It is a Chart option: on ChartWidget it goes in `chartOptions`.' },
  Chart: { ChartWidget: 'It is a ChartWidget option, not one of the headless Chart.' },
  ChartWidgetGrid: { ChartWidget: 'It is a ChartWidget option: on a grid it goes in `widget` (every chart) or `cells` (one chart).' },
};

function unknownOption(ctx: Context, owner: string, key: string, names: readonly string[], path: string): void {
  const home = TARGETS.find((t) => t !== owner && ctx.catalog.options[t].some((o) => o.name === key));
  const hint = home ? ELSEWHERE[owner as Target]?.[home] : undefined;
  // An option that belongs elsewhere was not misspelled: no look-alike to offer.
  problem(ctx, path, `Unknown option '${key}' for ${owner}.${hint ? ` ${hint}` : ''}`, hint ? [] : names, key);
}

/**
 * `under`: the options this object is laid over, if any (a grid's `widget` under each of its `cells`),
 * whose values count as set here too.
 */
function checkObject(ctx: Context, entries: readonly OptionEntry[], value: unknown, path: string, owner: string, under: Record<string, unknown> = {}): void {
  if (!isObject(value)) {
    problem(ctx, path, `${owner} options must be an object.`);
    return;
  }
  const names = entries.map((e) => e.name);
  const siblings = { ...under, ...value };
  for (const [key, item] of Object.entries(value)) {
    const entry = entries.find((e) => e.name === key);
    if (!entry) unknownOption(ctx, owner, key, names, at(path, key));
    else if (item !== undefined) checkValue(ctx, owner, entry, item, at(path, key), siblings);
  }
}

function checkFeatures(ctx: Context, value: unknown, path: string): void {
  if (!isObject(value)) {
    problem(ctx, path, '`features` is an object of switch names, each true or false.');
    return;
  }
  const chartSwitches = (ctx.catalog.nested['Chart.features'] ?? []).map((o) => o.name);
  for (const [name, on] of Object.entries(value)) {
    if (!ctx.catalog.widgetFeatures.includes(name)) {
      // A switch of the chart inside (`drawings`) was not misspelled: it lives one level down.
      if (chartSwitches.includes(name)) problem(ctx, at(path, name), `'${name}' is a switch of the chart, not the widget: it goes in \`chartOptions.features\`.`);
      else problem(ctx, at(path, name), `Unknown feature switch '${name}'. list_widget_features lists them.`, ctx.catalog.widgetFeatures, name);
    } else if (typeof on !== 'boolean') {
      problem(ctx, at(path, name), `A feature switch is true or false, not ${JSON.stringify(on)}.`);
    }
  }
}

/** Style overrides, read by the library's own reader: whatever it turns away is a problem. */
function checkOverrides(ctx: Context, value: unknown, path: string): void {
  if (!isObject(value)) {
    problem(ctx, path, '`overrides` is an object of style keys and their values.');
    return;
  }
  const keys = Object.keys(ctx.catalog.styleKeys);
  for (const key of readChartStyleOverrides(value).rejected) {
    // Own keys only: `constructor` is on every object, and is not a style key.
    const kind = Object.hasOwn(ctx.catalog.styleKeys, key) ? ctx.catalog.styleKeys[key] : undefined;
    if (!kind) problem(ctx, at(path, key), `Unknown style key '${key}'. list_style_keys lists them.`, keys, key);
    else problem(ctx, at(path, key), `'${key}' takes ${STYLE_KINDS[kind] ?? `a ${kind}`}, not ${JSON.stringify(value[key])}.`);
  }
}

const STYLE_KINDS: Record<string, string> = {
  color: 'a CSS color',
  boolean: 'true or false',
  lineStyle: "'solid', 'dashed' or 'dotted'",
  width: 'a width in pixels, above 0 and at most 20',
};

/** The widget's language lookup: the code, then zh-TW and the like as Traditional Chinese, then the language alone. */
function localeCandidates(locale: string): string[] {
  const lower = locale.toLowerCase().replace('_', '-');
  const out = [lower];
  if (/^zh-(tw|hk|mo|hant)/.test(lower)) out.push('zh-hant');
  const language = lower.split('-')[0];
  if (language !== lower) out.push(language);
  if (language === 'no' || language === 'nn') out.push('nb');
  return out;
}

function checkLocale(ctx: Context, value: unknown, path: string, hasMessages: boolean): void {
  const codes = ctx.catalog.languages.map((l) => l.code);
  if (typeof value !== 'string') {
    problem(ctx, path, `\`locale\` is a language code: ${quoted(codes)}.`);
    return;
  }
  const language = localeCandidates(value)
    .map((code) => ctx.catalog.languages.find((l) => l.code.toLowerCase() === code))
    .find((l) => l !== undefined);
  if (!language && hasMessages) {
    // Another language, its strings in `messages`: the library takes it, and the code still sets direction and numbers.
    ctx.notes.push(`The widget has no '${value}' table: its strings come from \`messages\`, English where a key is missing.`);
    return;
  }
  if (!language) {
    problem(ctx, path, `The widget has no '${value}' language. It has ${quoted(codes)}; any other works with its strings in \`messages\`.`, codes, value);
    return;
  }
  if (!language.builtIn) {
    ctx.notes.push(`${language.name} ('${language.code}') is not built into the widget: call registerWidgetLocales() from '@tradecanvas/chart/widget/locales' before creating it.`);
  }
}

/** Intervals to show in a message, in the order a person reads them. */
const EXAMPLE_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

function checkTimeframe(ctx: Context, value: unknown, path: string): void {
  // The library's own readers: time intervals, and tick bars (`100T`).
  if (typeof value === 'string' && (isTimeFrame(value) || tickBarCount(value) !== null)) return;
  problem(ctx, path, `${JSON.stringify(value)} is not an interval: use one like ${quoted(EXAMPLE_INTERVALS)}, any <n><s|m|h|d|w|M>, or <n>T for tick bars.`, ctx.catalog.timeframes, value);
}

function checkPlain(ctx: Context, entry: OptionEntry, value: unknown, path: string): void {
  if (entry.kind === 'function') {
    // JSON has no functions: a string stands for the code an agent will write there.
    if (typeof value !== 'function' && typeof value !== 'string') problem(ctx, path, `'${entry.name}' is a function.`);
    return;
  }
  const ok = entry.kind === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === entry.kind;
  if (!ok) problem(ctx, path, `'${entry.name}' takes a ${entry.kind}, not ${JSON.stringify(value)}.`);
}

/** `siblings`: the options set beside this one, those it is laid over included. */
function checkValue(ctx: Context, owner: string, entry: OptionEntry, value: unknown, path: string, siblings: Record<string, unknown>): void {
  const { catalog } = ctx;
  switch (`${owner}.${entry.name}`) {
    case 'ChartWidget.chartOptions': return checkObject(ctx, catalog.nested['ChartWidget.chartOptions'] ?? catalog.options.Chart, value, path, 'Chart');
    case 'ChartWidget.features': return checkFeatures(ctx, value, path);
    case 'ChartWidget.locale': return checkLocale(ctx, value, path, isObject(siblings.messages));
    case 'Chart.features': return checkObject(ctx, catalog.nested['Chart.features'] ?? [], value, path, 'Chart features');
    case 'Chart.overrides': return checkOverrides(ctx, value, path);
    case 'ChartWidgetGrid.widget': return checkObject(ctx, catalog.options.ChartWidget, value, path, 'ChartWidget');
    case 'ChartWidgetGrid.cells':
      if (!Array.isArray(value)) return problem(ctx, path, '`cells` is an array of ChartWidget options, one per chart.');
      // Each cell is laid over the grid's `widget` options.
      value.forEach((cell, i) => checkObject(ctx, catalog.options.ChartWidget, cell, `${path}[${i}]`, 'ChartWidget', isObject(siblings.widget) ? siblings.widget : {}));
      return;
  }
  if (entry.name === 'theme' && !isObject(value) && value !== 'dark' && value !== 'light') {
    return problem(ctx, path, "`theme` is 'dark', 'light' or a theme object.", ['dark', 'light'], value);
  }
  if (entry.name === 'ui' && !isObject(value) && !catalog.looks.includes(value as string)) {
    return problem(ctx, path, `\`ui\` is a look (${quoted(catalog.looks)}) or a look object.`, catalog.looks, value);
  }
  const type = entry.type.replace(/^readonly /, '');
  if (type === 'TimeFrame') return checkTimeframe(ctx, value, path);
  if (type === 'TimeFrame[]') {
    if (!Array.isArray(value)) return problem(ctx, path, `'${entry.name}' is an array of intervals.`);
    value.forEach((tf, i) => checkTimeframe(ctx, tf, `${path}[${i}]`));
    return;
  }
  const { values, items } = entry;
  if (values) {
    if (!values.includes(value as string | number)) problem(ctx, path, `'${entry.name}' is one of ${quoted(values)}.`, strings(values), value);
    return;
  }
  if (items) {
    if (!Array.isArray(value)) return problem(ctx, path, `'${entry.name}' is an array of ${quoted(items)}.`);
    value.forEach((item, i) => {
      if (!items.includes(item as string | number)) problem(ctx, `${path}[${i}]`, `${JSON.stringify(item)} is not one of ${quoted(items)}.`, strings(items), item);
    });
    return;
  }
  if (entry.kind) checkPlain(ctx, entry, value, path);
}

/**
 * Checks an options object for `new ChartWidget(el, options)`, `new Chart(el,
 * options)` or `new ChartWidgetGrid(el, options)`: unknown names (with the one
 * likely meant), values outside a union, wrong plain kinds, intervals, feature
 * switches, style overrides and languages, nested options included. Values it
 * cannot judge from JSON (adapters, theme objects, callbacks) pass.
 */
export function validateOptions(target: Target, options: unknown, catalog: Catalog = CATALOG): Validation {
  const ctx: Context = { catalog, problems: [], notes: [] };
  checkObject(ctx, catalog.options[target], options, '', target);
  return { valid: ctx.problems.length === 0, problems: ctx.problems, notes: ctx.notes };
}
