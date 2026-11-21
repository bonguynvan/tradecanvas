import type {
  DataSeries,
  IndicatorCategory,
  IndicatorConfig,
  IndicatorDescriptor,
  IndicatorFill,
  IndicatorGroup,
  IndicatorInputSpec,
  IndicatorOutput,
  IndicatorPlacement,
  IndicatorPlot,
  IndicatorPlugin,
  IndicatorScale,
  IndicatorValue,
} from '@tradecanvas/commons';
import { IndicatorBase } from './IndicatorBase.js';
import { outputOf } from './math.js';
import { ta, type Ta } from './ta.js';

/** What an input holds: a number, a text (a choice, a colour, a source) or a switch. */
export type IndicatorInputValue = number | string | boolean;

/** An input of a defined indicator: where it starts, and how the settings dialog shows and bounds it. */
export interface DefinedIndicatorInput extends IndicatorInputSpec {
  /** The value it starts with. Its type is the input's type. */
  default: IndicatorInputValue;
}

/** The bars a defined indicator reads, a column each: `bars.close[i]` is bar `i`'s close. */
export interface IndicatorBars {
  readonly length: number;
  /** Each bar's time, ms since the epoch. */
  readonly time: readonly number[];
  readonly open: readonly number[];
  readonly high: readonly number[];
  readonly low: readonly number[];
  /** The closes; with an input declared `source: true`, the source the user picked. */
  readonly close: readonly number[];
  readonly volume: readonly number[];
}

/** What a defined indicator's `calculate` is handed. */
export interface IndicatorCalculation<Inputs> {
  bars: IndicatorBars;
  /** Each input's value now: the one set in the settings dialog, else its default. */
  inputs: Inputs;
  /** The sums indicators are made of: `ta.ema(bars.close, 20)`. */
  ta: Ta;
}

/**
 * A line an indicator returns: a value a bar, in the bars' order. A bar with
 * no value has `undefined`, `null` or `NaN`. `true` marks a bar and `false`
 * leaves it, for a plot of `kind: 'markers'` on the prices: above or below
 * the bar by its `position`, else at the bar's close. A mark in a pane of
 * its own is a number: the value it is drawn at.
 */
export type IndicatorLine = readonly (number | boolean | null | undefined)[];

/** The values the inputs of a definition hold, by name. */
export type InputsOf<D extends Record<string, DefinedIndicatorInput>> = {
  [K in keyof D]: D[K]['default'] extends number ? number : D[K]['default'] extends boolean ? boolean : D[K]['default'] extends string ? string : IndicatorInputValue;
};

/** An indicator as `defineIndicator` takes it. */
export interface IndicatorDefinition<D extends Record<string, DefinedIndicatorInput> = Record<string, DefinedIndicatorInput>> {
  /** Its id: what `chart.addIndicator(id)` adds. */
  id: string;
  /** Its name in the Indicators dialog. */
  name: string;
  /** Its name in legends; defaults to the id in capitals. */
  shortName?: string;
  /** `'overlay'`: on the prices. `'panel'` (the default): in a pane of its own under them. */
  placement?: IndicatorPlacement;
  /** Its group in the widget's Indicators dialog: a built-in kind, or a group of your app's. */
  category?: IndicatorCategory | IndicatorGroup;
  /** Its inputs, by name: each with its default, and how the settings dialog shows it. */
  inputs?: D;
  /**
   * How each line is drawn, by the key `calculate` returns it under. Left
   * out, every line returned is a line in the theme's series colours, in the
   * order returned (found by running `calculate` once on no bars).
   */
  plots?: readonly IndicatorPlot[];
  /** Shading between two of its lines. */
  fills?: readonly IndicatorFill[];
  /** The scale of its pane, for a panel that reads between set values (0 to 100). */
  scale?: IndicatorScale;
  /** Levels drawn across its pane (30 and 70). */
  levels?: readonly number[];
  /** Its lines, by key: each a value a bar. */
  calculate(context: IndicatorCalculation<InputsOf<D>>): Record<string, IndicatorLine>;
}

/** The bars as columns. */
function columnsOf(data: DataSeries): IndicatorBars {
  const column = (read: (bar: DataSeries[number]) => number) => data.map(read);
  return {
    length: data.length,
    time: column((bar) => bar.time),
    open: column((bar) => bar.open),
    high: column((bar) => bar.high),
    low: column((bar) => bar.low),
    close: column((bar) => bar.close),
    volume: column((bar) => bar.volume ?? 0),
  };
}

const NO_BARS: IndicatorBars = { length: 0, time: [], open: [], high: [], low: [], close: [], volume: [] };

/**
 * An input's value as `calculate` gets it: what was set when it is of the
 * default's type, else the default. A number is kept within the input's
 * `min` and `max`, and whole for a `kind: 'int'`, as the settings dialog
 * keeps it and the built-in indicators read theirs; a choice is one of the
 * `options`.
 */
function inputValue(set: unknown, input: DefinedIndicatorInput): IndicatorInputValue {
  const fallback = input.default;
  if (typeof fallback === 'number') {
    const typed = typeof set === 'string' && set.trim() !== '' ? Number(set) : set;
    if (typeof typed !== 'number' || !Number.isFinite(typed)) return fallback;
    const whole = input.kind === 'int' ? Math.floor(typed) : typed;
    return Math.min(input.max ?? Infinity, Math.max(input.min ?? -Infinity, whole));
  }
  if (typeof set !== typeof fallback) return fallback;
  if (input.options && !input.options.some((option) => (typeof option === 'object' ? option.value : option) === set)) return fallback;
  return set as IndicatorInputValue;
}

/** What a mark given as `true` is stored as: no price of its own (above or below its bar), the bar's close, or nothing to draw it at. */
type MarkAt = 'bar' | 'close' | 'nowhere';

class DefinedIndicator<D extends Record<string, DefinedIndicatorInput>> extends IndicatorBase {
  descriptor: IndicatorDescriptor;

  constructor(private readonly definition: IndicatorDefinition<D>) {
    super();
    const inputs = definition.inputs ?? ({} as D);
    const names = Object.keys(inputs);
    this.descriptor = {
      id: definition.id,
      name: definition.name,
      placement: definition.placement ?? 'panel',
      defaultConfig: Object.fromEntries(names.map((name) => [name, inputs[name].default])),
      plots: definition.plots ? definition.plots.map((plot) => ({ ...plot })) : this.plotsFound(),
      ...(definition.shortName !== undefined ? { shortName: definition.shortName } : {}),
      ...(definition.category !== undefined ? { category: definition.category } : {}),
      ...(definition.fills ? { fills: definition.fills.map((fill) => ({ ...fill })) } : {}),
      ...(definition.scale ? { scale: { ...definition.scale } } : {}),
      ...(definition.levels ? { levels: [...definition.levels] } : {}),
      ...(names.length > 0 ? { inputs: Object.fromEntries(names.map((name) => [name, specOf(inputs[name])])) } : {}),
    };
  }

  /** A line for each key `calculate` returns, from a run on no bars with the defaults. */
  private plotsFound(): IndicatorPlot[] {
    let keys: string[];
    try {
      keys = Object.keys(this.linesOf(NO_BARS, {}));
    } catch (cause) {
      throw new Error(`defineIndicator('${this.definition.id}'): its lines could not be found by running calculate on no bars. Declare them in plots.`, { cause });
    }
    // A calculate that returns nothing for too few bars would be an indicator that never draws.
    if (keys.length === 0) throw new Error(`defineIndicator('${this.definition.id}'): calculate returned no lines on no bars, so there is nothing to draw. Declare them in plots.`);
    return keys.map((key, i) => ({ key, title: key, color: i }));
  }

  /** Where a mark given as `true` under `key` goes. */
  private markAt(key: string): MarkAt {
    const plot = this.descriptor.plots?.find((p) => p.key === key);
    if (this.descriptor.placement !== 'overlay') return 'nowhere';
    return plot?.kind === 'markers' && (plot.position === 'aboveBar' || plot.position === 'belowBar') ? 'bar' : 'close';
  }

  /** The console was told that marks given as `true` have no place in a pane of its own. */
  private warned = false;

  private warnOfMarks(key: string): void {
    if (this.warned) return;
    this.warned = true;
    console.warn(`[defineIndicator] '${this.definition.id}': the line '${key}' marks bars with true, but in a pane of its own a mark needs the value it is drawn at. Return that number on the bars to mark; the marks are left out.`);
  }

  private linesOf(bars: IndicatorBars, params: Record<string, unknown>): Record<string, IndicatorLine> {
    const declared = this.definition.inputs ?? ({} as D);
    const inputs = Object.fromEntries(Object.keys(declared).map((name) => [name, inputValue(params[name], declared[name])])) as InputsOf<D>;
    return this.definition.calculate({ bars, inputs, ta });
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const lines = Object.entries(this.linesOf(columnsOf(data), config.params)).map(([key, line]) => ({ key, line, markAt: this.markAt(key) }));
    const points: (IndicatorValue | null)[] = data.map((bar, i) => {
      let point: IndicatorValue | null = null;
      for (const { key, line, markAt } of lines) {
        const raw = line[i];
        let value: number | undefined;
        if (raw === true) {
          if (markAt === 'nowhere') this.warnOfMarks(key);
          // Above or below its bar it needs no price: any number marks it.
          else value = markAt === 'close' ? bar.close : 1;
        } else if (typeof raw === 'number' && Number.isFinite(raw)) value = raw;
        if (value !== undefined) (point ??= {})[key] = value;
      }
      return point;
    });
    return outputOf(data, points);
  }
}

/** An input as the descriptor declares it: all of it but where it starts. */
function specOf(input: DefinedIndicatorInput): IndicatorInputSpec {
  const { default: _start, ...spec } = input;
  return spec;
}

/**
 * An indicator from its inputs and one function of the bars: no class, no
 * drawing code. `calculate` is handed the bars as columns, the inputs' values
 * and the `ta` sums, and returns its lines by key; the chart draws them,
 * scales their pane, lists them in the legend and gives each input a field in
 * the settings dialog. Register what it returns: `chart.registerIndicator(...)`.
 *
 * It computes over all the bars on each tick. An indicator slow enough for
 * that to show extends `IndicatorBase` and gives an `update`.
 */
export function defineIndicator<D extends Record<string, DefinedIndicatorInput> = Record<string, never>>(definition: IndicatorDefinition<D>): IndicatorPlugin {
  if (typeof definition.id !== 'string' || definition.id.trim() === '') throw new Error('defineIndicator: an indicator needs an id');
  if (typeof definition.calculate !== 'function') throw new Error(`defineIndicator('${definition.id}'): an indicator needs a calculate function`);
  return new DefinedIndicator(definition);
}
