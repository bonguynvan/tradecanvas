import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Vortex Indicator (VI+ / VI−). Captures trend direction and strength from the
 * relationship between consecutive highs/lows normalised by true range. VI+
 * crossing above VI− signals an up-trend (and vice-versa); the wider the gap,
 * the stronger the trend.
 */
export class VortexIndicator extends IndicatorBase {
  descriptor = {
    id: 'vortex',
    name: 'Vortex Indicator',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length <= period) return { values, series };

    // Per-bar VM+ / VM- / TR (defined from index 1 onward).
    const vmPlus = new Array(data.length).fill(0);
    const vmMinus = new Array(data.length).fill(0);
    const tr = new Array(data.length).fill(0);
    for (let i = 1; i < data.length; i++) {
      vmPlus[i] = Math.abs(data[i].high - data[i - 1].low);
      vmMinus[i] = Math.abs(data[i].low - data[i - 1].high);
      const h = data[i].high;
      const l = data[i].low;
      const pc = data[i - 1].close;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }

    let sumVMp = 0;
    let sumVMm = 0;
    let sumTR = 0;
    for (let i = 1; i < data.length; i++) {
      sumVMp += vmPlus[i];
      sumVMm += vmMinus[i];
      sumTR += tr[i];
      if (i > period) {
        sumVMp -= vmPlus[i - period];
        sumVMm -= vmMinus[i - period];
        sumTR -= tr[i - period];
      }
      if (i >= period && sumTR > 0) {
        const val: IndicatorValue = { viPlus: sumVMp / sumTR, viMinus: sumVMm / sumTR };
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

    let min = Infinity;
    let max = -Infinity;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i];
      if (!v) continue;
      for (const k of ['viPlus', 'viMinus'] as const) {
        const x = v[k];
        if (x === undefined) continue;
        if (x < min) min = x;
        if (x > max) max = x;
      }
    }
    if (min === Infinity) return;
    const pad = (max - min) * 0.1 || 0.1;
    min -= pad;
    max += pad;
    const span = max - min || 1;
    const toY = (val: number) => chartRect.y + chartRect.height * (1 - (val - min) / span);

    // Reference line at 1.0 (the VI pivot).
    if (1 >= min && 1 <= max) {
      ctx.strokeStyle = style.colors[2] ?? '#787B86';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const y = toY(1);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const drawLine = (key: 'viPlus' | 'viMinus', color: string) => {
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

    drawLine('viPlus', style.colors[0] ?? '#26A69A');
    drawLine('viMinus', style.colors[1] ?? '#EF5350');
  }
}
