import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getNumberParam } from '../params.js';
import { outputOf } from '../math.js';

/**
 * Accumulative Swing Index (Wilder): the running sum of each bar's swing
 * index, which weighs the move from the previous close (and the bar's own
 * body, and the previous bar's) against the bar's true range, scaled by the
 * limit move: the most a price may move in a bar. It runs with the trend.
 */
export class AccumulativeSwingIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'asi',
    name: 'Accumulative Swing Index',
    placement: 'panel',
    defaultConfig: { limit: 10 },
    shortName: 'ASI',
    inputs: { limit: { label: 'Limit move', min: 0.0001, step: 0.1 } },
    plots: [{ key: 'value', title: 'ASI', color: 0 }],
    scale: { zero: true },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const limit = Math.max(1e-9, getNumberParam(config, 'limit', 10));
    const points: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    let asi = 0;
    for (let i = 1; i < data.length; i++) {
      asi += swingIndex(data[i - 1], data[i], limit);
      points[i] = { value: asi };
    }
    return outputOf(data, points);
  }
}

function swingIndex(prev: OHLCBar, bar: OHLCBar, limit: number): number {
  const toHigh = Math.abs(bar.high - prev.close);
  const toLow = Math.abs(bar.low - prev.close);
  const range = bar.high - bar.low;
  const prevBody = Math.abs(prev.close - prev.open);
  let r: number;
  if (toHigh >= toLow && toHigh >= range) r = toHigh - 0.5 * toLow + 0.25 * prevBody;
  else if (toLow >= toHigh && toLow >= range) r = toLow - 0.5 * toHigh + 0.25 * prevBody;
  else r = range + 0.25 * prevBody;
  if (r === 0) return 0;
  const move = bar.close - prev.close + 0.5 * (bar.close - bar.open) + 0.25 * (prev.close - prev.open);
  return ((50 * move) / r) * (Math.max(toHigh, toLow) / limit);
}
