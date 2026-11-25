import type { PriceChartOptions } from '@tradecanvas/commons';
import { isValidTimeZone } from '@tradecanvas/commons';

/** The most decimals a price is shown to. */
const MAX_PRICE_DECIMALS = 20;
/** The names a theme is known by; any other theme is the theme itself. */
const THEME_NAMES: readonly unknown[] = ['dark', 'light'];
/** The zone of the symbol's exchange, as `Chart` takes it: a still chart has none to ask, and reads it as UTC. */
export const EXCHANGE_ZONE = 'exchange';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Each of a list's entries as an object, or a TypeError that names the one that is none. */
function eachObject(list: unknown, name: string, check: (item: Record<string, unknown>, at: string) => void): void {
  if (list === undefined) return;
  if (!Array.isArray(list)) throw new TypeError(`renderPriceChart: options.${name} is an array.`);
  list.forEach((item: unknown, i) => {
    const at = `options.${name}[${i}]`;
    if (!isObject(item)) throw new TypeError(`renderPriceChart: ${at} is not an object.`);
    check(item, at);
  });
}

function checkIndicators(list: unknown): void {
  const named = new Set<string>();
  eachObject(list, 'indicators', (ind, at) => {
    if (typeof ind.id !== 'string' || ind.id === '') throw new TypeError(`renderPriceChart: ${at} needs an id: the indicator's, such as 'rsi'.`);
    if (ind.params !== undefined && !isObject(ind.params)) throw new TypeError(`renderPriceChart: ${at}.params is an object of the indicator's inputs.`);
    if (ind.instanceId === undefined) return;
    if (typeof ind.instanceId !== 'string' || ind.instanceId === '') throw new TypeError(`renderPriceChart: ${at}.instanceId is a name: a string.`);
    // Two of a name: which of them a `pane` or a `source` means could not be told.
    if (named.has(ind.instanceId)) throw new RangeError(`renderPriceChart: two indicators are called '${ind.instanceId}' (${at}.instanceId).`);
    named.add(ind.instanceId);
  });
}

function checkDrawings(list: unknown): void {
  eachObject(list, 'drawings', (drawing, at) => {
    if (typeof drawing.type !== 'string') throw new TypeError(`renderPriceChart: ${at} needs a type: the drawing tool's, such as 'trendLine'.`);
    if (!Array.isArray(drawing.anchors) || !drawing.anchors.every(isObject)) throw new TypeError(`renderPriceChart: ${at} needs anchors: an array of { time, price }.`);
    if (drawing.style !== undefined && !isObject(drawing.style)) throw new TypeError(`renderPriceChart: ${at}.style is an object.`);
  });
}

function checkMarkers(list: unknown): void {
  eachObject(list, 'markers', (marker, at) => {
    if (typeof marker.time !== 'number' || typeof marker.price !== 'number') throw new TypeError(`renderPriceChart: ${at} needs a time (ms) and a price, both numbers.`);
  });
}

function checkFootprint(list: unknown): void {
  eachObject(list, 'footprint', (bar, at) => {
    if (typeof bar.time !== 'number') throw new TypeError(`renderPriceChart: ${at} needs a time (ms): its bar's.`);
    if (!Array.isArray(bar.levels) || !bar.levels.every(isObject)) throw new TypeError(`renderPriceChart: ${at} needs levels: an array of { price, buy, sell }.`);
  });
}

function checkNumbers(options: Record<string, unknown>): void {
  const { rightMargin, pricePrecision, visibleRange } = options;
  if (rightMargin !== undefined && !(typeof rightMargin === 'number' && rightMargin >= 0)) {
    throw new RangeError('renderPriceChart: options.rightMargin is a number of bars, 0 or more.');
  }
  if (pricePrecision !== undefined && !(typeof pricePrecision === 'number' && Number.isInteger(pricePrecision) && pricePrecision >= 0 && pricePrecision <= MAX_PRICE_DECIMALS)) {
    throw new RangeError(`renderPriceChart: options.pricePrecision is a whole number of decimals, 0 to ${MAX_PRICE_DECIMALS}.`);
  }
  if (visibleRange === undefined) return;
  if (!isObject(visibleRange) || typeof visibleRange.from !== 'number' || typeof visibleRange.to !== 'number') {
    throw new TypeError('renderPriceChart: options.visibleRange is { from, to }: the times (ms) of the first and the last bar on view.');
  }
}

function checkZone(zone: unknown): void {
  if (zone === undefined || zone === null || zone === EXCHANGE_ZONE) return;
  if (typeof zone === 'number' && Number.isFinite(zone)) return;
  if (typeof zone === 'number') throw new RangeError(`renderPriceChart: invalid UTC offset: ${zone}`);
  if (typeof zone !== 'string' || !isValidTimeZone(zone)) throw new RangeError(`renderPriceChart: unknown time zone: ${String(zone)}`);
}

function checkSymbolSeries(series: unknown): void {
  if (series === undefined) return;
  if (!isObject(series)) throw new TypeError('renderPriceChart: options.symbolSeries is an object: a symbol, and its bars.');
  for (const [symbol, bars] of Object.entries(series)) {
    if (!Array.isArray(bars)) throw new TypeError(`renderPriceChart: options.symbolSeries['${symbol}'] is that symbol's bars: an array.`);
  }
}

/**
 * Says what is wrong with a still chart's options before anything is drawn:
 * a TypeError for what is the wrong kind of thing, a RangeError for a value
 * outside what it can be, each naming the option. Further in, the same
 * mistake would fail somewhere that names none of it, with half a chart on
 * the canvas.
 */
export function checkOptions(given: PriceChartOptions): void {
  const options = given as unknown as Record<string, unknown>;
  if (!Array.isArray(options.data)) throw new TypeError('renderPriceChart: options.data is the bars: an array, oldest first.');
  const { theme, features } = options;
  if (typeof theme === 'string' ? !THEME_NAMES.includes(theme) : theme !== undefined && (!isObject(theme) || !isObject(theme.font))) {
    throw new RangeError("renderPriceChart: options.theme is 'dark', 'light', or a theme of your own.");
  }
  if (features !== undefined && !isObject(features)) throw new TypeError('renderPriceChart: options.features is an object of switches, such as { volume: false }.');
  checkIndicators(options.indicators);
  checkDrawings(options.drawings);
  checkMarkers(options.markers);
  checkFootprint(options.footprint);
  eachObject(options.plugins, 'plugins', (plugin, at) => {
    if (typeof plugin.kind !== 'string' || !isObject(plugin.plugin)) throw new TypeError(`renderPriceChart: ${at} is a plugin: { kind, plugin }.`);
  });
  checkNumbers(options);
  checkZone(options.timeZone);
  checkSymbolSeries(options.symbolSeries);
}
