import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf, smaOf } from '../math.js';

/** How far a line may be shifted, either way. */
const MAX_OFFSET = 500;

/**
 * Moving Average Channel: the average of the highs over `upperLength` bars
 * and of the lows over `lowerLength`, each shifted by its own offset (later
 * by a positive one, earlier by a negative one), with the channel shaded.
 */
export class MAChannelIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'machannel',
    name: 'Moving Average Channel',
    placement: 'overlay',
    defaultConfig: { upperLength: 20, lowerLength: 20, upperOffset: 0, lowerOffset: 0 },
    shortName: 'MA Channel',
    inputs: {
      upperLength: { kind: 'int', min: 1 },
      lowerLength: { kind: 'int', min: 1 },
      upperOffset: { kind: 'int', min: -MAX_OFFSET, max: MAX_OFFSET },
      lowerOffset: { kind: 'int', min: -MAX_OFFSET, max: MAX_OFFSET },
    },
    fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.08 }],
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'lower', title: 'Lower', color: 1 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const upper = shifted(smaOf(data.map((b) => b.high), getIntParam(config, 'upperLength', 20, 1)), offsetOf(config, 'upperOffset'));
    const lower = shifted(smaOf(data.map((b) => b.low), getIntParam(config, 'lowerLength', 20, 1)), offsetOf(config, 'lowerOffset'));
    const points: (IndicatorValue | null)[] = upper.map((u, i) => {
      const l = lower[i];
      if (u === undefined && l === undefined) return null;
      return { ...(u !== undefined ? { upper: u } : {}), ...(l !== undefined ? { lower: l } : {}) };
    });
    return outputOf(data, points);
  }
}

function offsetOf(config: IndicatorConfig, key: string): number {
  const v = Number(config.params[key] ?? 0);
  return Number.isFinite(v) ? Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(v))) : 0;
}

/** `src` moved `offset` bars later (earlier when negative). */
function shifted(src: readonly (number | undefined)[], offset: number): (number | undefined)[] {
  return src.map((_, i) => src[i - offset]);
}
