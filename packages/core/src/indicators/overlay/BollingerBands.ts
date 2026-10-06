import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam, getNumberParam } from '../params.js';
import { withAlpha } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { LinePen, fillDenseBand, isDenseSlots } from '../linePen.js';
import { plotLook } from '../plots.js';

export class BollingerBandsIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'bb',
    name: 'Bollinger Bands',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, stdDev: 2, source: 'close' },
    shortName: 'BB',
    inputs: { source: { source: true } },
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'middle', title: 'Basis', color: 1 },
      { key: 'lower', title: 'Lower', color: 0 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const stdDevMult = getNumberParam(config, 'stdDev', 2);
    const values = new IndicatorValueMap();
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

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 20, 1);
    const stdDevMult = getNumberParam(config, 'stdDev', 2);
    for (let i = from; i < data.length; i++) {
      if (i < period - 1) { this.writePoint(prev, data, i, null); continue; }
      let sum = 0;
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const c = data[j].close;
        sum += c;
        sumSq += c * c;
      }
      const sma = sum / period;
      const stdDev = Math.sqrt(Math.max(0, sumSq / period - sma * sma));
      this.writePoint(prev, data, i, {
        middle: sma,
        upper: sma + stdDevMult * stdDev,
        lower: sma - stdDevMult * stdDev,
      });
    }
    return prev;
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
    const middleYs = new Float64Array(maxPts);
    const lowerYs = new Float64Array(maxPts);

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.upper === undefined) continue;
      const x = barIndexToX(i, viewport);
      upperXs[count] = x; upperYs[count] = priceToY(val.upper!, viewport);
      middleYs[count] = priceToY(val.middle!, viewport);
      lowerYs[count] = priceToY(val.lower!, viewport);
      count++;
    }

    if (count < 2) return;
    // Zoomed out, the band and the lines go column by column (see LinePen).
    const dense = isDenseSlots(viewport);
    const xs = upperXs.subarray(0, count);

    // Band fill
    if (dense) {
      fillDenseBand(ctx, xs, upperYs, lowerYs, withAlpha(style.colors[0], 0.1), count);
    } else {
      ctx.beginPath();
      ctx.moveTo(upperXs[0], upperYs[0]);
      for (let i = 1; i < count; i++) ctx.lineTo(upperXs[i], upperYs[i]);
      for (let i = count - 1; i >= 0; i--) ctx.lineTo(upperXs[i], lowerYs[i]);
      ctx.closePath();
      ctx.fillStyle = withAlpha(style.colors[0], 0.1);
      ctx.fill();
    }

    // Upper, middle and lower lines
    const line = (ys: Float64Array, color: string, key: 'upper' | 'middle' | 'lower') => {
      const look = plotLook(style, key, style.lineWidths[0]);
      if (!look.visible) return;
      const pen = new LinePen(ctx, color, style.lineWidths[0], dense, look.dash);
      for (let i = 0; i < count; i++) pen.add(xs[i], ys[i]);
      pen.finish();
    };
    line(upperYs, style.colors[0], 'upper');
    line(middleYs, style.colors[1] ?? style.colors[0], 'middle');
    line(lowerYs, style.colors[0], 'lower');
  }
}
