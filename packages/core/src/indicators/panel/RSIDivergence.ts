import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorRenderContext, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { RSIIndicator } from './RSI.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { divergenceRules, resumeDivergences, type Divergence, type DivergenceRules, type DivergenceTurns } from './detectDivergences.js';

/** A hidden divergence's line is dashed: it says the trend goes on, not that it may turn. */
const HIDDEN_DASH = [4, 3];
/** The RSI's width when none is set. */
const LINE_WIDTH = 1.5;
/** A divergence's line is this much wider than the RSI's: lying along it on a flat run, it still reads as a line of its own. */
const WIDER = 1;

/** What the indicator keeps beside its RSI: the divergences, the turns they were read from, and the rules they were found by. */
interface Found {
  divergences: Divergence[];
  turns: DivergenceTurns;
  rules: DivergenceRules;
}

const sameRules = (a: DivergenceRules, b: DivergenceRules): boolean =>
  a.left === b.left && a.right === b.right && a.minBars === b.minBars && a.maxBars === b.maxBars && a.hidden === b.hidden;

/**
 * The RSI with its divergences from the price: a line between the RSI's two
 * turns where the price went on and the RSI did not (bullish at two lows,
 * bearish at two highs), and a mark at the second. `left` and `right` are
 * the bars a turn stands out from, `right` also how many bars late a
 * divergence is known (it is settled when the bar confirming it closes:
 * while that bar forms, it can come and go); `minBars` and `maxBars` how far apart the two turns
 * may be; `hidden` (1 or 0) adds the hidden ones, dashed. `bull` and `bear`
 * give the RSI at the second turn. `detectDivergences` reads any line.
 */
export class RSIDivergenceIndicator extends RSIIndicator {
  descriptor: IndicatorDescriptor = {
    id: 'rsidiv',
    name: 'RSI Divergence',
    placement: 'panel',
    defaultConfig: { period: 14, left: 5, right: 5, minBars: 5, maxBars: 60, hidden: 0 },
    shortName: 'RSI Div',
    inputs: {
      period: { kind: 'int', min: 1 },
      left: { kind: 'int', min: 1 },
      right: { kind: 'int', min: 1 },
      minBars: { kind: 'int', min: 1 },
      maxBars: { kind: 'int', min: 1 },
      hidden: { kind: 'int', min: 0, max: 1 },
    },
    plots: [
      { key: 'value', title: 'RSI', color: 0 },
      { key: 'bull', title: 'Bullish', color: 3, kind: 'markers' },
      { key: 'bear', title: 'Bearish', color: 4, kind: 'markers' },
    ],
    scale: { min: 0, max: 100 },
    levels: [30, 70],
  };

  /** The RSI as plain numbers a bar, beside each output: what the turns are read from. */
  private lines = new WeakMap<IndicatorOutput, number[]>();

  private rulesOf(config: IndicatorConfig): DivergenceRules {
    return divergenceRules({
      left: getIntParam(config, 'left', 5, 1),
      right: getIntParam(config, 'right', 5, 1),
      minBars: getIntParam(config, 'minBars', 5, 1),
      maxBars: getIntParam(config, 'maxBars', 60, 1),
      hidden: getIntParam(config, 'hidden', 0, 0) >= 1,
    });
  }

  /** The output's RSI as numbers, bars from `from` on read again from its points. */
  private lineOf(output: IndicatorOutput, length: number, from: number): number[] {
    let line = this.lines.get(output);
    let start = from;
    if (!line) {
      line = [];
      start = 0;
      this.lines.set(output, line);
    }
    line.length = length;
    for (let i = start; i < length; i++) line[i] = output.series?.[i]?.value ?? Number.NaN;
    return line;
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const output = super.calculate(data, config);
    const found: Found = { divergences: [], turns: { lows: [], highs: [] }, rules: this.rulesOf(config) };
    resumeDivergences(data, this.lineOf(output, data.length, 0), found.divergences, found.turns, 0, found.rules);
    this.mark(output, data, found.divergences, 0);
    output.meta = { ...found };
    return output;
  }

  /** A turn is decided by the bars after it: a tick may make or unmake the divergence ending `right` bars back. */
  revisesBefore(config: IndicatorConfig): number {
    return this.rulesOf(config).right;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const found = prev.meta as Partial<Found> | undefined;
    const rules = this.rulesOf(config);
    if (!found?.divergences || !found.turns || !found.rules || !sameRules(found.rules, rules)) return null;
    const output = super.update(data, config, prev, from);
    if (!output?.series) return null;
    // The marks from where the turns are looked for again are taken off: the bars before `from` keep their RSI.
    const start = Math.max(0, from - rules.right);
    for (let i = start; i < Math.min(from, output.series.length); i++) {
      const point = output.series[i];
      if (point && (point.bull !== undefined || point.bear !== undefined)) this.writePoint(output, data, i, { value: point.value });
    }
    resumeDivergences(data, this.lineOf(output, data.length, from), found.divergences, found.turns, from, rules);
    this.mark(output, data, found.divergences, start);
    output.meta = { divergences: found.divergences, turns: found.turns, rules };
    return output;
  }

  /** The RSI at each divergence's second turn, under its kind's key, for the divergences ending at `start` or later. */
  private mark(output: IndicatorOutput, data: DataSeries, divergences: readonly Divergence[], start: number): void {
    for (let k = divergences.length - 1; k >= 0 && divergences[k].to >= start; k--) {
      const d: Divergence = divergences[k];
      const point = output.series?.[d.to];
      if (!point) continue;
      this.writePoint(output, data, d.to, { ...point, [d.kind === 'bullish' ? 'bull' : 'bear']: d.valueTo });
    }
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle, context?: IndicatorRenderContext): void {
    super.render(ctx, output, viewport, style, context);
    const divergences = output.meta?.divergences as readonly Divergence[] | undefined;
    if (!divergences || divergences.length === 0) return;
    const first = Math.floor(viewport.visibleRange.from);
    const last = Math.ceil(viewport.visibleRange.to);
    ctx.save();
    // Wider than the RSI's line, and following a width set for the indicator.
    ctx.lineWidth = (style.lineWidths[0] ?? LINE_WIDTH) + WIDER;
    // On top of any fading the context already has, as the plots are.
    ctx.globalAlpha *= style.opacity;
    // In the order of their second turns: from the newest back to the first that ends before the bars in view.
    for (let k = divergences.length - 1; k >= 0; k--) {
      const d: Divergence = divergences[k];
      if (d.to < first) break;
      if (d.from > last) continue;
      const key = d.kind === 'bullish' ? 'bull' : 'bear';
      if (style.plots?.[key]?.visible === false) continue;
      ctx.strokeStyle = style.colors[d.kind === 'bullish' ? 3 : 4] ?? style.colors[0];
      ctx.setLineDash(d.hidden ? HIDDEN_DASH : []);
      ctx.beginPath();
      ctx.moveTo(barIndexToX(d.from, viewport), priceToY(d.valueFrom, viewport));
      ctx.lineTo(barIndexToX(d.to, viewport), priceToY(d.valueTo, viewport));
      ctx.stroke();
    }
    ctx.restore();
  }
}
