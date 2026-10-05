import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { closes, emaOf, highAt, lowAt, outputOf } from '../math.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

const EMA_LENGTH = 34;
/** Bars whose range scales the slope: the angle reads alike at any price. */
const RANGE_BARS = 30;

/**
 * Chop Zone: the angle, in degrees, of the 34-bar EMA's slope, its rise per
 * bar scaled by the range of the last 30 bars. Each bar is coloured by its
 * zone, from turquoise (rising steeply) through yellow (flat, choppy) to
 * dark red (falling steeply); the zones are the indicator, so it keeps its
 * own colours whatever the style.
 */
export class ChopZoneIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'chopzone',
    name: 'Chop Zone',
    placement: 'panel',
    defaultConfig: {},
    shortName: 'Chop Zone',
    plots: [{ key: 'angle', title: 'Angle', color: 0, kind: 'histogram' }],
    scale: { zero: true },
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const ema = emaOf(closes(data), EMA_LENGTH);
    const points: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    for (let i = 1; i < data.length; i++) {
      const now = ema[i];
      const before = ema[i - 1];
      const high = highAt(data, i, RANGE_BARS);
      const low = lowAt(data, i, RANGE_BARS);
      if (now === undefined || before === undefined || high === undefined || low === undefined || high === low) continue;
      const bar = data[i];
      const typical = (bar.high + bar.low + bar.close) / 3;
      // The slope is read against the price: none for prices at or below zero.
      if (!(typical > 0 && low > 0)) continue;
      const rise = ((now - before) / typical) * ((25 / (high - low)) * low);
      points[i] = { angle: (Math.atan(rise) * 180) / Math.PI };
    }
    return outputOf(data, points);
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, _style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;
    const baseY = priceToY(0, viewport);
    const bars: { x: number; y: number; baseY: number; color: string }[] = [];
    for (let i = from; i <= to && i < series.length; i++) {
      const angle = series[i]?.angle;
      if (angle === undefined) continue;
      bars.push({ x: barIndexToX(i, viewport), y: priceToY(angle, viewport), baseY, color: chopZoneColor(angle) });
    }
    this.drawHistogram(ctx, bars, Math.max(1, viewport.barWidth));
  }
}

/** The colour of the zone an angle (degrees) falls in. */
export function chopZoneColor(angle: number): string {
  if (angle >= 5) return '#26C6DA';
  if (angle >= 3.57) return '#43A047';
  if (angle >= 2.14) return '#A5D6A7';
  if (angle >= 0.71) return '#009688';
  if (angle <= -5) return '#D50000';
  if (angle <= -3.57) return '#E91E63';
  if (angle <= -2.14) return '#FF6D00';
  if (angle <= -0.71) return '#FFB74D';
  return '#FDD835';
}
