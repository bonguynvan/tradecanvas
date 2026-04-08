import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class ADXIndicator extends IndicatorBase {
  descriptor = {
    id: 'adx',
    name: 'Average Directional Index',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const values = new Map<number, IndicatorValue>();

    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length < period * 2) return { values, series };

    const trArr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close),
      );
      trArr.push(tr);

      const upMove = data[i].high - data[i - 1].high;
      const downMove = data[i - 1].low - data[i].low;
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Smoothed values
    let smoothTR = 0;
    let smoothPlusDM = 0;
    let smoothMinusDM = 0;
    for (let i = 0; i < period; i++) {
      smoothTR += trArr[i];
      smoothPlusDM += plusDM[i];
      smoothMinusDM += minusDM[i];
    }

    const dxValues: number[] = [];

    for (let i = period; i < trArr.length; i++) {
      if (i > period) {
        smoothTR = smoothTR - smoothTR / period + trArr[i];
        smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
        smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
      }

      const plusDI = smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
      const minusDI = smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
      const diSum = plusDI + minusDI;
      const dx = diSum !== 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0;
      dxValues.push(dx);

      const dataIdx = i + 1;
      const val: IndicatorValue = { plusDI, minusDI, dx };
      values.set(data[dataIdx].time, val);
      series[dataIdx] = val;
    }

    // ADX = smoothed DX
    if (dxValues.length >= period) {
      let adx = 0;
      for (let i = 0; i < period; i++) adx += dxValues[i];
      adx /= period;

      const startDataIdx = period * 2;
      if (startDataIdx < data.length) {
        const existing = values.get(data[startDataIdx].time);
        if (existing) existing.adx = adx;
        if (series[startDataIdx]) series[startDataIdx]!.adx = adx;
      }

      for (let i = period; i < dxValues.length; i++) {
        adx = (adx * (period - 1) + dxValues[i]) / period;
        const dataIdx = i + period + 1;
        if (dataIdx < data.length) {
          const existing = values.get(data[dataIdx].time);
          if (existing) existing.adx = adx;
          if (series[dataIdx]) series[dataIdx]!.adx = adx;
        }
      }
    }

    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;
    const toY = (val: number) => chartRect.y + chartRect.height * (1 - val / 100);

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

    drawLine('adx', style.colors[0]);
    drawLine('plusDI', style.colors[1] ?? '#26A69A');
    drawLine('minusDI', style.colors[2] ?? '#EF5350');
  }
}
