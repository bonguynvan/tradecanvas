import type { OHLCBar } from '@tradecanvas/commons';
import { floatColumn, type Column } from './Column.js';
import { inputValue, type OnBar, type PriceSeries, type Script, type ScriptBar, type ScriptInputs, type ScriptPrices } from './defineScript.js';
import { Outputs, type ScriptDeclarations, type ScriptError, type ScriptOutput } from './outputs.js';
import { inScope, type Scope } from './scope.js';
import { arrayOf, keep, seriesOf } from './state.js';

const PRICES = ['time', 'open', 'high', 'low', 'close', 'volume'] as const;
type Price = (typeof PRICES)[number];

/** What `update` did with a bar: ran the live bar again, ran a new bar, or nothing (an older bar: load the bars again). */
export type UpdateKind = 'tick' | 'bar' | 'reload';

/**
 * A script run over bars. `load` runs every bar; the last one stays live:
 * `tick` runs it again from the state the bar before left, `next` closes it
 * and runs a new bar. A tick costs one bar, whatever the bars before.
 */
export class ScriptRun {
  private scope!: Scope;
  private outputs!: Outputs;
  private onBar!: OnBar;
  private prices!: Record<Price, Column<Float64Array>>;
  private count = 0;
  private errors: ScriptError[] = [];
  /** The bar the script threw on, after which no bar runs; -1: none. */
  private haltedAt = -1;
  private declared!: ScriptDeclarations;
  /** Whether no bar has run since the setup: a load needs no setup of its own. */
  private fresh = false;

  /** What it draws, known from its setup. */
  get declarations(): ScriptDeclarations {
    return this.declared;
  }

  constructor(
    private readonly script: Script<ScriptInputs>,
    private readonly params: Readonly<Record<string, unknown>> = {},
  ) {
    this.start();
  }

  /** How many bars it has run. */
  get length(): number {
    return this.count;
  }

  get output(): ScriptOutput {
    return this.outputs.output(this.count, this.errors);
  }

  /** Run all of `bars` from the start; the last one stays live. */
  load(bars: readonly OHLCBar[]): void {
    if (!this.fresh) this.start();
    this.fresh = false;
    for (let i = 0; i < bars.length; i++) {
      if (i === bars.length - 1) this.goLive();
      this.write(i, bars[i]);
      this.count = i + 1;
      this.runBar(i);
    }
  }

  /** The live bar as it now is: run it again from the state the bar before left. */
  tick(bar: OHLCBar): void {
    if (this.count === 0) return this.load([bar]);
    this.fresh = false;
    const i = this.count - 1;
    this.write(i, bar);
    for (const unit of this.scope.units) unit.rollback();
    if (this.haltedAt === i) {
      this.haltedAt = -1;
      this.errors = this.errors.filter((error) => error.bar !== i);
    }
    this.runBar(i);
  }

  /**
   * Close the live bar as it last ran, and run `bar` as the new live one. A
   * script that threw on the live bar stays stopped once it closes, as on
   * any closed bar: load the bars again to run it anew.
   */
  next(bar: OHLCBar): void {
    if (this.count === 0) return this.load([bar]);
    this.fresh = false;
    this.goLive();
    const i = this.count;
    this.write(i, bar);
    this.count = i + 1;
    this.runBar(i);
  }

  /** A bar from a feed: a tick when it has the live bar's time, a new bar when later. An earlier one is not run: load the bars again. */
  update(bar: OHLCBar): UpdateKind {
    if (this.count === 0) {
      this.load([bar]);
      return 'bar';
    }
    const live = this.prices.time.get(this.count - 1);
    if (bar.time === live) {
      this.tick(bar);
      return 'tick';
    }
    if (bar.time > live) {
      this.next(bar);
      return 'bar';
    }
    return 'reload';
  }

  /** Begin again from no bars: a new setup, new state. */
  private start(): void {
    const scope: Scope = { units: [], live: false, bar: 0, clearers: [] };
    this.scope = scope;
    this.prices = Object.fromEntries(PRICES.map((p) => [p, floatColumn()])) as Record<Price, Column<Float64Array>>;
    this.outputs = new Outputs(scope);
    this.count = 0;
    this.errors = [];
    this.haltedAt = -1;
    const declared = this.script.inputs ?? {};
    const inputs = Object.fromEntries(Object.keys(declared).map((name) => [name, inputValue(this.params[name], declared[name])]));
    this.onBar = inScope(scope, () => this.script.setup({
      inputs: inputs as never,
      prices: this.priceSeries(),
      plot: (title, options) => this.outputs.plot(title, options),
      shape: (title, options) => this.outputs.shape(title, options),
      hline: (price, options) => this.outputs.hline(price, options),
      state: { var: keep, array: arrayOf, series: seriesOf },
    }));
    this.outputs.close();
    if (typeof this.onBar !== 'function') throw new Error(`script '${this.script.id}': setup must return what each bar runs`);
    this.declared = this.outputs.declarations(this.script.overlay === true);
    this.fresh = true;
  }

  /** From here on the bar run is the live one: keep the state the bars before left. */
  private goLive(): void {
    for (const unit of this.scope.units) unit.commit();
    this.scope.live = true;
  }

  private priceSeries(): ScriptPrices {
    const read = (price: Price): PriceSeries => ({
      // Never a bar ahead: a bar sees only itself and the bars before it.
      at: (back = 0) => (back >= 0 ? this.prices[price].get(this.scope.bar - Math.floor(back)) : Number.NaN),
    });
    return Object.fromEntries(PRICES.map((p) => [p, read(p)])) as unknown as ScriptPrices;
  }

  private write(i: number, bar: OHLCBar): void {
    const p = this.prices;
    p.time.set(i, bar.time);
    p.open.set(i, bar.open);
    p.high.set(i, bar.high);
    p.low.set(i, bar.low);
    p.close.set(i, bar.close);
    p.volume.set(i, bar.volume ?? 0);
  }

  private runBar(i: number): void {
    const scope = this.scope;
    scope.bar = i;
    for (const clear of scope.clearers) clear(i);
    if (this.haltedAt >= 0) return;
    const p = this.prices;
    const bar: ScriptBar = { index: i, time: p.time.get(i), open: p.open.get(i), high: p.high.get(i), low: p.low.get(i), close: p.close.get(i), volume: p.volume.get(i) };
    try {
      // Not in the scope: a sum or a kept value made on a bar is refused, not made again each bar.
      this.onBar(bar);
    } catch (error) {
      this.haltedAt = i;
      this.errors.push({ bar: i, message: error instanceof Error ? error.message : String(error) });
    }
  }
}
