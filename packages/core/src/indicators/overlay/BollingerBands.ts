import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { withAlpha } from '@chart-lib/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

export class BollingerBandsIndicator extends IndicatorBase {
  descriptor = {
    id: 'bb',
    name: 'Bollinger Bands',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, stdDev: 2 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const stdDevMult = config.params.stdDev as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    // Running sum and sum-of-squares for O(n) calculation
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < data.length; i++) {
      const c = data[i].close;
      sum += c;
      sumSq += c * c;

      if (i >= period) {
        const old = data[i - period].close;
        sum -= old;
        sumSq -= old * old;
      }

      if (i >= period - 1) {
        const sma = sum / period;
        // variance = E[x²] - (E[x])²
        const variance = sumSq / period - sma * sma;
        const stdDev = Math.sqrt(Math.max(0, variance));

        const val: IndicatorValue = {
          middle: sma,
          upper: sma + stdDevMult * stdDev,
          lower: sma - stdDevMult * stdDev,
        };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    // Build point arrays in a single pass — reuse arrays via length reset
    let count = 0;
    const maxPts = to - from + 1;
    const upperXs = new Float64Array(maxPts);
    const upperYs = new Float64Array(maxPts);
    const middleXs = new Float64Array(maxPts);
    const middleYs = new Float64Array(maxPts);
    const lowerXs = new Float64Array(maxPts);
    const lowerYs = new Float64Array(maxPts);

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.upper === undefined) continue;
      const x = barIndexToX(i, viewport);
      upperXs[count] = x; upperYs[count] = priceToY(val.upper!, viewport);
      middleXs[count] = x; middleYs[count] = priceToY(val.middle!, viewport);
      lowerXs[count] = x; lowerYs[count] = priceToY(val.lower!, viewport);
      count++;
    }

    if (count < 2) return;

    // Band fill
    ctx.beginPath();
    ctx.moveTo(upperXs[0], upperYs[0]);
    for (let i = 1; i < count; i++) ctx.lineTo(upperXs[i], upperYs[i]);
    for (let i = count - 1; i >= 0; i--) ctx.lineTo(lowerXs[i], lowerYs[i]);
    ctx.closePath();
    ctx.fillStyle = withAlpha(style.colors[0], 0.1);
    ctx.fill();

    // Upper line
    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    ctx.moveTo(upperXs[0], upperYs[0]);
    for (let i = 1; i < count; i++) ctx.lineTo(upperXs[i], upperYs[i]);
    ctx.stroke();

    // Middle line
    ctx.beginPath();
    ctx.strokeStyle = style.colors[1] ?? style.colors[0];
    ctx.moveTo(middleXs[0], middleYs[0]);
    for (let i = 1; i < count; i++) ctx.lineTo(middleXs[i], middleYs[i]);
    ctx.stroke();

    // Lower line
    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.moveTo(lowerXs[0], lowerYs[0]);
    for (let i = 1; i < count; i++) ctx.lineTo(lowerXs[i], lowerYs[i]);
    ctx.stroke();
  }
}
