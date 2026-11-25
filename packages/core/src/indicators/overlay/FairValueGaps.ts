import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam, getNumberParam } from '../params.js';
import { drawZoneBox } from './zoneBox.js';
import { fairValueGapFloor, resumeFairValueGaps, type FairValueGap } from './detectFairValueGaps.js';


/**
 * Fair value gaps: a box over the prices three bars left traded by the
 * middle one alone, from that bar to the right edge while the gap is open,
 * to the bar that filled it once it is. Gaps going up are in the patterns'
 * bullish colour, gaps going down in their bearish one, apart from the
 * candles' own; each price of a gap is a
 * plot, hidden on its own. `minPercent` leaves out the
 * small ones; `showFilled` (1 or 0) keeps the filled ones on the chart.
 * At the bar a gap formed on, `bull`/`bullLow` or `bear`/`bearLow` give its
 * top and bottom. `detectFairValueGaps` gives them all, with where each was
 * filled.
 */
export class FairValueGapsIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'fvg',
    name: 'Fair Value Gaps',
    placement: 'overlay',
    defaultConfig: { minPercent: 0, showFilled: 0 },
    shortName: 'FVG',
    inputs: { minPercent: { kind: 'number', min: 0, step: 0.05 }, showFilled: { kind: 'int', min: 0, max: 1 } },
    plots: [
      { key: 'bull', title: 'Bullish top', color: 3 },
      { key: 'bullLow', title: 'Bullish bottom', color: 3 },
      { key: 'bear', title: 'Bearish top', color: 4 },
      { key: 'bearLow', title: 'Bearish bottom', color: 4 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const minPercent = fairValueGapFloor(getNumberParam(config, 'minPercent', 0));
    const gaps: FairValueGap[] = [];
    resumeFairValueGaps(data, gaps, 0, minPercent);
    const out: IndicatorOutput = {
      values: new IndicatorValueMap(),
      series: new Array<IndicatorValue | null>(data.length).fill(null),
      meta: { gaps, minPercent, showFilled: getIntParam(config, 'showFilled', 0, 0) >= 1 },
    };
    for (const gap of gaps) this.writePoint(out, data, gap.formed, pointOf(gap));
    return out;
  }

  /** A tick finds again only the gaps formed from the changed bar on, and where the open ones are filled. */
  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const gaps = prev.meta?.gaps as FairValueGap[] | undefined;
    const minPercent = fairValueGapFloor(getNumberParam(config, 'minPercent', 0));
    if (!Array.isArray(gaps) || prev.meta?.minPercent !== minPercent || !prev.series || !this.canResume(data, prev, from)) return null;
    const series = prev.series;
    for (let i = from; i < series.length; i++) {
      if (series[i] && i < data.length) this.writePoint(prev, data, i, null);
    }
    series.length = data.length;
    for (let i = from; i < data.length; i++) series[i] = null;
    resumeFairValueGaps(data, gaps, from, minPercent);
    for (let k = gaps.length - 1; k >= 0 && gaps[k].formed >= from; k--) this.writePoint(prev, data, gaps[k].formed, pointOf(gaps[k]));
    prev.meta = { gaps, minPercent, showFilled: getIntParam(config, 'showFilled', 0, 0) >= 1 };
    return prev;
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const gaps = output.meta?.gaps as readonly FairValueGap[] | undefined;
    if (!gaps || gaps.length === 0) return;
    const showFilled = output.meta?.showFilled === true;
    ctx.save();
    for (const gap of gaps) {
      if (gap.filledAt !== null && !showFilled) continue;
      // Gaps are in the order they formed, so by their first bar: none after one right of the plot is in view.
      if (drawZoneBox(ctx, { start: gap.index, end: gap.filledAt, top: gap.top, bottom: gap.bottom, up: gap.direction === 'up' }, viewport, style) === 'past') break;
    }
    ctx.restore();
  }
}

/** A gap's two prices, under its direction's keys, at the bar it formed on. */
function pointOf(gap: FairValueGap): IndicatorValue {
  return gap.direction === 'up' ? { bull: gap.top, bullLow: gap.bottom } : { bear: gap.top, bearLow: gap.bottom };
}
