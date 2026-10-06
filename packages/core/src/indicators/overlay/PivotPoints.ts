import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { lineDash } from '@tradecanvas/commons';

const LEVEL_KEYS = ['s3', 's2', 's1', 'pp', 'r1', 'r2', 'r3'] as const;
type LevelKey = (typeof LEVEL_KEYS)[number];

const KINDS = ['traditional', 'fibonacci', 'woodie', 'classic', 'camarilla', 'dm'] as const;
type Kind = (typeof KINDS)[number];

/**
 * Pivot points from the high, low and close of the last `lookback` bars
 * (and their first open, for DeMark's), by kind: traditional, Fibonacci,
 * Woodie, classic, Camarilla or DeMark (one level either side).
 */
export class PivotPointsIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'pivots',
    name: 'Pivot Points',
    placement: 'overlay' as const,
    defaultConfig: { lookback: 24, type: 'traditional' },
    shortName: 'Pivots',
    inputs: { lookback: { min: 1 }, type: { options: KINDS } },
    plots: [
      { key: 'r3', title: 'R3', color: 1 },
      { key: 'r2', title: 'R2', color: 1 },
      { key: 'r1', title: 'R1', color: 1 },
      { key: 'pp', title: 'P', color: 0 },
      { key: 's1', title: 'S1', color: 2 },
      { key: 's2', title: 'S2', color: 2 },
      { key: 's3', title: 'S3', color: 2 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const lookback = getIntParam(config, 'lookback', 24, 1);
    const kind: Kind = (KINDS as readonly unknown[]).includes(config.params.type) ? (config.params.type as Kind) : 'traditional';
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length <= lookback) return { values, series };

    for (let i = lookback; i < data.length; i++) {
      let high = -Infinity;
      let low = Infinity;
      for (let j = i - lookback; j < i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      const val = levels(kind, data[i - lookback].open, high, low, data[i - 1].close);
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const ppColor = style.colors[0];
    const rColor = style.colors[1] ?? '#e8505b';
    const sColor = style.colors[2] ?? '#1fa874';
    const lineWidth = style.lineWidths[0];

    const colorFor = (key: LevelKey): string => {
      if (key === 'pp') return ppColor;
      return key.startsWith('r') ? rColor : sColor;
    };

    for (const key of LEVEL_KEYS) {
      // Each level's plot style: hidden, or dashed otherwise than its own (the pivot solid, the others dashed).
      const own = style.plots?.[key];
      if (own?.visible === false) continue;
      ctx.beginPath();
      ctx.strokeStyle = colorFor(key);
      ctx.lineWidth = key === 'pp' ? lineWidth : Math.max(1, lineWidth - 1);
      ctx.setLineDash(lineDash(own?.lineStyle ?? (key === 'pp' ? 'solid' : 'dashed'), [4, 3], ctx.lineWidth));

      let started = false;
      for (let i = from; i <= to && i < series.length; i++) {
        const val = series[i];
        const v = val?.[key];
        if (v === undefined) continue;
        const x = barIndexToX(i, viewport);
        const y = priceToY(v, viewport);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/** The levels of one kind from a window's open, high, low and close. */
function levels(kind: Kind, open: number, high: number, low: number, close: number): IndicatorValue {
  const range = high - low;
  if (kind === 'dm') {
    const x = close < open ? high + 2 * low + close : close > open ? 2 * high + low + close : high + low + 2 * close;
    return { pp: x / 4, r1: x / 2 - low, s1: x / 2 - high };
  }
  if (kind === 'camarilla') {
    const step = range * 1.1;
    return {
      pp: (high + low + close) / 3,
      r1: close + step / 12, s1: close - step / 12,
      r2: close + step / 6, s2: close - step / 6,
      r3: close + step / 4, s3: close - step / 4,
    };
  }
  const pp = kind === 'woodie' ? (high + low + 2 * close) / 4 : (high + low + close) / 3;
  if (kind === 'fibonacci') {
    return {
      pp,
      r1: pp + 0.382 * range, s1: pp - 0.382 * range,
      r2: pp + 0.618 * range, s2: pp - 0.618 * range,
      r3: pp + range, s3: pp - range,
    };
  }
  const r1 = 2 * pp - low;
  const s1 = 2 * pp - high;
  if (kind === 'classic') return { pp, r1, s1, r2: pp + range, s2: pp - range, r3: pp + 2 * range, s3: pp - 2 * range };
  // Traditional, and Woodie's levels from its own pivot.
  return { pp, r1, s1, r2: pp + range, s2: pp - range, r3: high + 2 * (pp - low), s3: low - 2 * (high - pp) };
}
