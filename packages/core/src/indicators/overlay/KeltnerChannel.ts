import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { withAlpha } from '@chart-lib/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

export class KeltnerChannelIndicator extends IndicatorBase {
  descriptor = {
    id: 'keltner',
    name: 'Keltner Channel',
    placement: 'overlay' as const,
    defaultConfig: { emaPeriod: 20, atrPeriod: 10, multiplier: 1.5 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const emaPeriod = config.params.emaPeriod as number;
    const atrPeriod = config.params.atrPeriod as number;
    const mult = config.params.multiplier as number;
    const values = new Map<number, IndicatorValue>();
    if (data.length < Math.max(emaPeriod, atrPeriod)) return { values };

    // EMA of close
    const emaMult = 2 / (emaPeriod + 1);
    let ema = data[0].close;
    const emaArr: number[] = [ema];
    for (let i = 1; i < data.length; i++) {
      ema = (data[i].close - ema) * emaMult + ema;
      emaArr.push(ema);
    }

    // ATR
    const trArr: number[] = [data[0].high - data[0].low];
    for (let i = 1; i < data.length; i++) {
      trArr.push(Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close),
      ));
    }

    let atr = 0;
    for (let i = 0; i < atrPeriod; i++) atr += trArr[i];
    atr /= atrPeriod;

    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const start = Math.max(emaPeriod, atrPeriod) - 1;
    for (let i = start; i < data.length; i++) {
      if (i > start) {
        atr = (atr * (atrPeriod - 1) + trArr[i]) / atrPeriod;
      }
      const val: IndicatorValue = {
        middle: emaArr[i],
        upper: emaArr[i] + mult * atr,
        lower: emaArr[i] - mult * atr,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const upperPts: { x: number; y: number }[] = [];
    const middlePts: { x: number; y: number }[] = [];
    const lowerPts: { x: number; y: number }[] = [];

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      const x = barIndexToX(i, viewport);
      if (val.upper !== undefined) upperPts.push({ x, y: priceToY(val.upper, viewport) });
      if (val.middle !== undefined) middlePts.push({ x, y: priceToY(val.middle, viewport) });
      if (val.lower !== undefined) lowerPts.push({ x, y: priceToY(val.lower, viewport) });
    }

    this.drawBand(ctx, upperPts, lowerPts, withAlpha(style.colors[0], 0.08));
    this.drawLine(ctx, upperPts, style.colors[0], style.lineWidths[0]);
    this.drawLine(ctx, middlePts, style.colors[1] ?? style.colors[0], style.lineWidths[0]);
    this.drawLine(ctx, lowerPts, style.colors[0], style.lineWidths[0]);
  }
}
