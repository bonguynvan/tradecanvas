import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class StochasticIndicator extends IndicatorBase {
  descriptor = {
    id: 'stochastic',
    name: 'Stochastic Oscillator',
    placement: 'panel' as const,
    defaultConfig: { kPeriod: 14, dPeriod: 3, smooth: 3 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const kPeriod = config.params.kPeriod as number;
    const dPeriod = config.params.dPeriod as number;
    const smooth = config.params.smooth as number;
    const values = new Map<number, IndicatorValue>();

    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length < kPeriod) return { values, series };

    // Raw %K
    const rawK: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < kPeriod - 1) { rawK.push(0); continue; }
      let high = -Infinity;
      let low = Infinity;
      for (let j = i - kPeriod + 1; j <= i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      rawK.push(high === low ? 50 : ((data[i].close - low) / (high - low)) * 100);
    }

    // Smoothed %K (SMA of raw %K)
    const kValues: number[] = [];
    for (let i = 0; i < rawK.length; i++) {
      if (i < kPeriod - 1 + smooth - 1) { kValues.push(0); continue; }
      let sum = 0;
      for (let j = i - smooth + 1; j <= i; j++) sum += rawK[j];
      kValues.push(sum / smooth);
    }

    // %D (SMA of %K)
    const startIdx = kPeriod - 1 + smooth - 1;
    for (let i = startIdx; i < kValues.length; i++) {
      const val: IndicatorValue = { k: kValues[i] };
      if (i >= startIdx + dPeriod - 1) {
        let sum = 0;
        for (let j = i - dPeriod + 1; j <= i; j++) sum += kValues[j];
        val.d = sum / dPeriod;
      }
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;
    const toY = (val: number) => chartRect.y + chartRect.height * (1 - val / 100);

    // Levels
    ctx.strokeStyle = style.colors[2] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [20, 80]) {
      const y = toY(level);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // %K line
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

    drawLine('k', style.colors[0]);
    drawLine('d', style.colors[1] ?? '#FF9800');
  }
}
