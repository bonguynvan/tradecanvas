// What the types say about the built-in indicators: compiled with the skill's
// examples (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import {
  Chart,
  indicatorSource,
  type BuiltInIndicatorId,
  type BuiltInIndicators,
  type IndicatorHost,
  type IndicatorId,
  type IndicatorSpec,
} from '@tradecanvas/chart';

declare const chart: Chart;
declare const field: { value: string };

// A built-in's inputs, by name, its id offered as one of a list.
const rsi = chart.addIndicator('rsi', { period: 14, source: 'close' });
chart.addIndicator('bb', { period: 20, stdDev: 2.5 }, 'bottom');
chart.addIndicator('pivots', { type: 'fibonacci' });
// Another indicator's line as the source.
if (rsi) chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') });

// @ts-expect-error A misspelt input: the bands' is `stdDev`.
chart.addIndicator('bb', { period: 20, stddev: 2 });
// @ts-expect-error An input RSI doesn't have.
chart.addIndicator('rsi', { length: 14 });
// @ts-expect-error A number's input takes no `true`.
chart.addIndicator('rsi', { period: true });

// What compiled before still does.
// Text for a number, as a form field gives it, and any text for a kind.
chart.addIndicator('ema', { period: field.value });
chart.addIndicator('ema', { period: '21' });
const kind: string = 'woodie';
chart.addIndicator('pivots', { type: kind });
// An indicator a plugin registers, or any id as a string, takes any inputs.
chart.addIndicator('myOwnIndicator', { anything: 'goes', n: 3 });
const someId: string = 'macd';
const record: Record<string, number | string | boolean> = { fast: 12 };
const numbers: Record<string, number> = { period: 14 };
chart.addIndicator(someId, record);
chart.addIndicator('rsi', numbers);
chart.addIndicator('rsi', record);
// An id from a list of built-ins, or a union of them.
declare const builtIn: BuiltInIndicatorId;
chart.addIndicator(builtIn);
declare const either: 'rsi' | 'macd';
chart.addIndicator(either, {});
// The components take the chart as their indicator host.
const host: IndicatorHost = chart;
const args: Parameters<Chart['addIndicator']> = ['rsi', { period: 14 }];

// The keys of the lines each one draws.
const band: BuiltInIndicators['bb']['lines'] = 'upper';
// @ts-expect-error Bollinger Bands have no `value` line.
const noLine: BuiltInIndicators['bb']['lines'] = 'value';

// Ids for the components' `indicators`.
const id: IndicatorId = 'macd';
const specs: IndicatorSpec[] = ['rsi', { id: 'ema', params: { period: 50 } }, { id: 'myOwnIndicator' }];

export { band, noLine, id, specs, host, args };
