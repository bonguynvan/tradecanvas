import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Elder's Force Index — combines price direction, extent, and volume into a
 * single oscillator around zero. Raw force = (close − prevClose) · volume,
 * then EMA-smoothed (default 13). Above zero = bulls in control, below = bears;
 * the magnitude reflects conviction. Zero-line reference, auto-scaled.
 */
export class ForceIndexIndicator extends IndicatorBase {
  descriptor = {
    id: 'fi',
    name: 'Force Index',
    placement: 'panel' as const,
    defaultConfig: { period: 13 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 13, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < 2) return { values, series };

    const k = 2 / (period + 1);
    let ema: number | undefined;
    for (let i = 1; i < data.length; i++) {
      const raw = (data[i].close - data[i - 1].close) * data[i].volume;
      ema = ema === undefined ? raw : raw * k + ema * (1 - k);
      // Let the EMA seed over `period` bars before emitting.
      if (i >= period) {
        const val: IndicatorValue = { value: ema };
        values.set(data[i].time, val);
        series[i] = val;
      }
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
      const v = series[i]?.value;
      if (v !== undefined && Math.abs(v) > absMax) absMax = Math.abs(v);
    }
    if (absMax === 0) return;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));

    // Zero line.
    const zeroY = toY(0);
    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, zeroY);
    ctx.lineTo(chartRect.x + chartRect.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = toY(val.value);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
