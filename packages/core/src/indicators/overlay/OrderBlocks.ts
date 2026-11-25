import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';
import { drawZoneBox } from './zoneBox.js';
import { emptyOrderBlockState, orderBlockLength, resumeOrderBlocks, type OrderBlock, type OrderBlockState } from './detectOrderBlocks.js';

/** A block's two prices, under its kind's keys, at the bar that formed it. */
const pointOf = (block: OrderBlock): IndicatorValue =>
  block.kind === 'bullish' ? { bull: block.top, bullLow: block.bottom } : { bear: block.top, bearLow: block.bottom };

/**
 * Order blocks: when a close breaks the latest swing high, the lowest bar
 * between the swing and that close is drawn as a box (a bullish block, its
 * high to its low); a close under the latest swing low draws the highest
 * bar between as a bearish one. A box runs to the right edge while the block
 * stands, and is taken off once a close goes through it, unless
 * `showBroken` is 1: then it ends, fainter, at the bar that broke it.
 * `length` is the bars a swing stands out from on each side, and so how many
 * bars late it is known. `count` is how many standing blocks of each side
 * are drawn, the latest (5; 0 for all): older far ones only clutter. Bullish blocks are in the patterns' rising colour,
 * bearish ones in their falling one, as fair value gaps are. At the bar a
 * block formed, `bull`/`bullLow` or `bear`/`bearLow` give its prices.
 * `detectOrderBlocks` gives them all with no chart.
 */
export class OrderBlocksIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'orderblocks',
    name: 'Order Blocks',
    placement: 'overlay',
    defaultConfig: { length: 5, showBroken: 0, count: 5 },
    shortName: 'OB',
    inputs: { length: { kind: 'int', min: 1, max: 50 }, showBroken: { kind: 'int', min: 0, max: 1 }, count: { kind: 'int', min: 0, max: 100 } },
    plots: [
      { key: 'bull', title: 'Bullish top', color: 3 },
      { key: 'bullLow', title: 'Bullish bottom', color: 3 },
      { key: 'bear', title: 'Bearish top', color: 4 },
      { key: 'bearLow', title: 'Bearish bottom', color: 4 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const length = orderBlockLength(getIntParam(config, 'length', 5, 1));
    const state = emptyOrderBlockState();
    resumeOrderBlocks(data, state, 0, length);
    const out: IndicatorOutput = {
      values: new IndicatorValueMap(),
      series: new Array<IndicatorValue | null>(data.length).fill(null),
      meta: { ...state, length, showBroken: getIntParam(config, 'showBroken', 0, 0) >= 1, count: getIntParam(config, 'count', 5, 0) },
    };
    for (const block of state.blocks) this.writePoint(out, data, block.formed, pointOf(block));
    return out;
  }

  /** A tick takes back what was found from the changed bar on, and finds it again: the swings, the blocks and their breaks. */
  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const meta = prev.meta as Partial<OrderBlockState> & { length?: number } | undefined;
    const length = orderBlockLength(getIntParam(config, 'length', 5, 1));
    if (!meta?.blocks || !meta.highs || !meta.lows || meta.length !== length || !prev.series || !this.canResume(data, prev, from)) return null;
    const state: OrderBlockState = { blocks: meta.blocks, highs: meta.highs, lows: meta.lows };
    const series = prev.series;
    for (let i = from; i < series.length; i++) if (series[i] && i < data.length) this.writePoint(prev, data, i, null);
    series.length = data.length;
    for (let i = from; i < data.length; i++) series[i] = null;
    resumeOrderBlocks(data, state, from, length);
    // In the bars' order, as the value map keeps them best.
    let k = state.blocks.length;
    while (k > 0 && state.blocks[k - 1].formed >= from) k--;
    for (; k < state.blocks.length; k++) this.writePoint(prev, data, state.blocks[k].formed, pointOf(state.blocks[k]));
    prev.meta = { ...state, length, showBroken: getIntParam(config, 'showBroken', 0, 0) >= 1, count: getIntParam(config, 'count', 5, 0) };
    return prev;
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const blocks = output.meta?.blocks as readonly OrderBlock[] | undefined;
    if (!blocks || blocks.length === 0) return;
    const showBroken = output.meta?.showBroken === true;
    // The latest `count` standing blocks of each side are drawn; 0 draws them all. Older far ones only clutter.
    const count = typeof output.meta?.count === 'number' ? output.meta.count : 0;
    const cap = count > 0 ? count : Number.POSITIVE_INFINITY;
    let bullish = 0;
    let bearish = 0;
    // A broken block ends at the bar that broke it: one that ends left of the plot is not in view.
    const left = viewport.chartRect.x - viewport.barWidth / 2;
    ctx.save();
    // Newest first, so the standing ones counted are the latest; blocks are not in the order of their own bars.
    for (let k = blocks.length - 1; k >= 0; k--) {
      const block = blocks[k];
      const up = block.kind === 'bullish';
      if (block.brokenAt === null) {
        if ((up ? bullish : bearish) >= cap) continue;
        if (up) bullish++;
        else bearish++;
      } else if (!showBroken || barIndexToX(block.brokenAt, viewport) < left) {
        // With no broken block drawn, once both sides have their count nothing older is.
        if (!showBroken && bullish >= cap && bearish >= cap) break;
        continue;
      }
      drawZoneBox(ctx, { start: block.index, end: block.brokenAt, top: block.top, bottom: block.bottom, up }, viewport, style);
    }
    ctx.restore();
  }
}
