import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Williams Alligator (Bill Williams) — three smoothed moving averages of the
 * median price ((high+low)/2), each shifted forward:
 *   jaw   = SMMA(13) shifted 8,  teeth = SMMA(8) shifted 5,  lips = SMMA(5) shifted 3.
 * When the lines intertwine the "alligator sleeps" (range); when they fan out
 * in order it "wakes and feeds" (trend). The forward shift means the lines stop
 * a few bars short of the latest bar, as intended.
 */
export class AlligatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'alligator',
    name: 'Alligator',
    placement: 'overlay' as const,
    defaultConfig: { jaw: 13, teeth: 8, lips: 5, jawShift: 8, teethShift: 5, lipsShift: 3 },
    inputs: { jaw: { kind: 'int', min: 1 }, teeth: { kind: 'int', min: 1 }, lips: { kind: 'int', min: 1 }, jawShift: { kind: 'int', min: 0 }, teethShift: { kind: 'int', min: 0 }, lipsShift: { kind: 'int', min: 0 } },
    shortName: 'Alligator',
    plots: [
      { key: 'jaw', title: 'Jaw', color: 0 },
      { key: 'teeth', title: 'Teeth', color: 1 },
      { key: 'lips', title: 'Lips', color: 2 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const jawP = getIntParam(config, 'jaw', 13, 1);
    const teethP = getIntParam(config, 'teeth', 8, 1);
    const lipsP = getIntParam(config, 'lips', 5, 1);
    const jawShift = getIntParam(config, 'jawShift', 8, 0);
    const teethShift = getIntParam(config, 'teethShift', 5, 0);
    const lipsShift = getIntParam(config, 'lipsShift', 3, 0);
    const values = new IndicatorValueMap();
    const n = data.length;
    const series: (IndicatorValue | null)[] = new Array(n).fill(null);
    if (n === 0) return { values, series };

    const median = data.map((b) => (b.high + b.low) / 2);
    const jawRaw = smma(median, jawP);
    const teethRaw = smma(median, teethP);
    const lipsRaw = smma(median, lipsP);

    const jaw: (number | undefined)[] = new Array(n).fill(undefined);
    const teeth: (number | undefined)[] = new Array(n).fill(undefined);
    const lips: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = 0; i < n; i++) {
      if (jawRaw[i] !== undefined && i + jawShift < n) jaw[i + jawShift] = jawRaw[i];
      if (teethRaw[i] !== undefined && i + teethShift < n) teeth[i + teethShift] = teethRaw[i];
      if (lipsRaw[i] !== undefined && i + lipsShift < n) lips[i + lipsShift] = lipsRaw[i];
    }

    for (let i = 0; i < n; i++) {
      if (jaw[i] === undefined && teeth[i] === undefined && lips[i] === undefined) continue;
      const val: IndicatorValue = {};
      if (jaw[i] !== undefined) val.jaw = jaw[i];
      if (teeth[i] !== undefined) val.teeth = teeth[i];
      if (lips[i] !== undefined) val.lips = lips[i];
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}

/** Wilder's smoothed moving average; undefined until the seed window fills. */
function smma(src: number[], period: number): (number | undefined)[] {
  const n = src.length;
  const out: (number | undefined)[] = new Array(n).fill(undefined);
  if (n < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += src[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < n; i++) {
    prev = (prev * (period - 1) + src[i]) / period;
    out[i] = prev;
  }
  return out;
}
