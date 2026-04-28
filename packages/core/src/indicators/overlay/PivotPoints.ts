import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

const LEVEL_KEYS = ['s3', 's2', 's1', 'pp', 'r1', 'r2', 'r3'] as const;
type LevelKey = (typeof LEVEL_KEYS)[number];

export class PivotPointsIndicator extends IndicatorBase {
  descriptor = {
    id: 'pivots',
    name: 'Pivot Points (Classic)',
    placement: 'overlay' as const,
    defaultConfig: { lookback: 24 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const lookback = getIntParam(config, 'lookback', 24, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length <= lookback) return { values, series };

    for (let i = lookback; i < data.length; i++) {
      let high = -Infinity;
      let low = Infinity;
      for (let j = i - lookback; j < i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      const close = data[i - 1].close;
      const pp = (high + low + close) / 3;
      const range = high - low;
      const val: IndicatorValue = {
        pp,
        r1: 2 * pp - low,
        s1: 2 * pp - high,
        r2: pp + range,
        s2: pp - range,
        r3: high + 2 * (pp - low),
        s3: low - 2 * (high - pp),
      };
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
    const rColor = style.colors[1] ?? '#EF5350';
    const sColor = style.colors[2] ?? '#26A69A';
    const lineWidth = style.lineWidths[0];

    const colorFor = (key: LevelKey): string => {
      if (key === 'pp') return ppColor;
      return key.startsWith('r') ? rColor : sColor;
    };

    for (const key of LEVEL_KEYS) {
      ctx.beginPath();
      ctx.strokeStyle = colorFor(key);
      ctx.lineWidth = key === 'pp' ? lineWidth : Math.max(1, lineWidth - 1);
      if (key !== 'pp') ctx.setLineDash([4, 3]);

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
