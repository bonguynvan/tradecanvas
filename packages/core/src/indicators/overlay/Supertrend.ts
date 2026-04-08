import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

export class SupertrendIndicator extends IndicatorBase {
  descriptor = {
    id: 'supertrend',
    name: 'Supertrend',
    placement: 'overlay' as const,
    defaultConfig: { period: 10, multiplier: 3 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const multiplier = config.params.multiplier as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < period) return { values, series };

    // ATR
    const trueRanges: number[] = [data[0].high - data[0].low];
    for (let i = 1; i < data.length; i++) {
      trueRanges.push(Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close),
      ));
    }

    let atr = 0;
    for (let i = 0; i < period; i++) atr += trueRanges[i];
    atr /= period;

    let upperBand = 0, lowerBand = 0;
    let prevUpperBand = 0, prevLowerBand = 0;
    let supertrend = 0;
    let prevSupertrend = 0;
    let direction = 1;

    for (let i = period - 1; i < data.length; i++) {
      if (i > period - 1) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
      }

      const hl2 = (data[i].high + data[i].low) / 2;
      const basicUpper = hl2 + multiplier * atr;
      const basicLower = hl2 - multiplier * atr;

      upperBand = (basicUpper < prevUpperBand || data[i - 1].close > prevUpperBand) ? basicUpper : prevUpperBand;
      lowerBand = (basicLower > prevLowerBand || data[i - 1].close < prevLowerBand) ? basicLower : prevLowerBand;

      if (prevSupertrend === prevUpperBand) {
        supertrend = data[i].close <= upperBand ? upperBand : lowerBand;
      } else {
        supertrend = data[i].close >= lowerBand ? lowerBand : upperBand;
      }

      direction = supertrend === lowerBand ? 1 : -1;

      const val: IndicatorValue = { value: supertrend, trend: direction };
      values.set(data[i].time, val);
      series[i] = val;

      prevUpperBand = upperBand;
      prevLowerBand = lowerBand;
      prevSupertrend = supertrend;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const upColor = style.colors[0];
    const downColor = style.colors[1] ?? '#EF5350';

    // Draw segments per trend direction
    let prevX = 0, prevY = 0, prevTrend = 0;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      const trend = val.trend ?? 1;

      if (prevTrend !== 0) {
        ctx.beginPath();
        ctx.strokeStyle = trend === 1 ? upColor : downColor;
        ctx.lineWidth = style.lineWidths[0] + 0.5;
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      prevX = x;
      prevY = y;
      prevTrend = trend;
    }
  }
}
