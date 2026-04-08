import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class TSIIndicator extends IndicatorBase {
  descriptor = {
    id: 'tsi',
    name: 'True Strength Index',
    placement: 'panel' as const,
    defaultConfig: { longPeriod: 25, shortPeriod: 13, signalPeriod: 7 },
  };

  private emaSmooth(values: number[], period: number): number[] {
    const mult = 2 / (period + 1);
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push((values[i] - result[i - 1]) * mult + result[i - 1]);
    }
    return result;
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const longP = config.params.longPeriod as number;
    const shortP = config.params.shortPeriod as number;
    const sigP = config.params.signalPeriod as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < 2) return { values, series };

    const momentum: number[] = [];
    const absMomentum: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const m = data[i].close - data[i - 1].close;
      momentum.push(m);
      absMomentum.push(Math.abs(m));
    }

    const smoothMom = this.emaSmooth(this.emaSmooth(momentum, longP), shortP);
    const smoothAbsMom = this.emaSmooth(this.emaSmooth(absMomentum, longP), shortP);

    const tsiValues: number[] = [];
    for (let i = 0; i < smoothMom.length; i++) {
      tsiValues.push(smoothAbsMom[i] === 0 ? 0 : (smoothMom[i] / smoothAbsMom[i]) * 100);
    }

    const signalLine = this.emaSmooth(tsiValues, sigP);

    for (let i = 0; i < tsiValues.length; i++) {
      const dataIdx = i + 1;
      if (dataIdx < data.length) {
        const val: IndicatorValue = {
          tsi: tsiValues[i],
          signal: signalLine[i],
        };
        values.set(data[dataIdx].time, val);
        series[dataIdx] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;

    let minVal = Infinity, maxVal = -Infinity;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      if (val.tsi !== undefined) { minVal = Math.min(minVal, val.tsi); maxVal = Math.max(maxVal, val.tsi); }
      if (val.signal !== undefined) { minVal = Math.min(minVal, val.signal); maxVal = Math.max(maxVal, val.signal); }
    }
    if (minVal === Infinity) return;
    const range = maxVal - minVal || 1;
    const pad = range * 0.1;
    const adjMin = minVal - pad, adjMax = maxVal + pad, adjRange = adjMax - adjMin;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v - adjMin) / adjRange);

    // Zero line
    if (0 >= adjMin && 0 <= adjMax) {
      ctx.strokeStyle = '#787B86';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, toY(0));
      ctx.lineTo(chartRect.x + chartRect.width, toY(0));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const drawLine = (key: string, color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = style.lineWidths[0];
      ctx.lineJoin = 'round';
      let started = false;
      for (let i = from; i <= to && i < series.length; i++) {
        const val = series[i];
        if (!val || val[key] === undefined) continue;
        const x = barIndexToX(i, viewport);
        const y = toY(val[key]!);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('tsi', style.colors[0]);
    drawLine('signal', style.colors[1] ?? '#FF9800');
  }
}
