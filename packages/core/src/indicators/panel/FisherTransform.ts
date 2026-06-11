import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Fisher Transform (John Ehlers) — maps price into a roughly Gaussian
 * distribution so turning points stand out as sharp peaks. Plotted with a
 * one-bar lagged trigger line; the Fisher crossing its trigger flags reversals.
 * Zero-centered, auto-scaled.
 */
export class FisherTransformIndicator extends IndicatorBase {
  descriptor = {
    id: 'fisher',
    name: 'Fisher Transform',
    placement: 'panel' as const,
    defaultConfig: { period: 9 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 9, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period) return { values, series };

    const mid = data.map((b) => (b.high + b.low) / 2);
    let value = 0;
    let fisher = 0;

    for (let i = period - 1; i < n; i++) {
      let hh = -Infinity;
      let ll = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (mid[j] > hh) hh = mid[j];
        if (mid[j] < ll) ll = mid[j];
      }
      const raw = hh - ll > 0 ? (2 * (mid[i] - ll)) / (hh - ll) - 1 : 0;
      value = 0.33 * raw + 0.67 * value;
      value = Math.max(-0.999, Math.min(0.999, value));
      const prevFisher = fisher;
      fisher = 0.5 * Math.log((1 + value) / (1 - value)) + 0.5 * fisher;
      const val: IndicatorValue = { value: fisher, trigger: prevFisher };
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

    let absMax = 0;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i];
      if (!v) continue;
      for (const k of ['value', 'trigger'] as const) {
        const x = v[k];
        if (x !== undefined && Math.abs(x) > absMax) absMax = Math.abs(x);
      }
    }
    if (absMax === 0) return;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));

    const zeroY = toY(0);
    ctx.strokeStyle = style.colors[2] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, zeroY);
    ctx.lineTo(chartRect.x + chartRect.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawLine = (key: 'value' | 'trigger', color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = style.lineWidths[0];
      ctx.lineJoin = 'round';
      let started = false;
      for (let i = from; i <= to && i < series.length; i++) {
        const val = series[i];
        if (!val || val[key] === undefined) { started = false; continue; }
        const x = barIndexToX(i, viewport);
        const y = toY(val[key]!);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('value', style.colors[0] ?? '#2962FF');
    drawLine('trigger', style.colors[1] ?? '#FF9800');
  }
}
