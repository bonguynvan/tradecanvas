import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Chande Momentum Oscillator (Tushar Chande) — like RSI but uses net momentum
 * over the period without smoothing, swinging −100…+100. Above +50 / below −50
 * mark overbought / oversold; the slope and zero-cross gauge momentum.
 *
 * CMO = 100 · (ΣUp − ΣDown) / (ΣUp + ΣDown) over `period`.
 */
export class ChandeMomentumIndicator extends IndicatorBase {
  descriptor = {
    id: 'cmo',
    name: 'Chande Momentum',
    placement: 'panel' as const,
    defaultConfig: { period: 9 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 9, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= period) return { values, series };

    const up = new Array(n).fill(0);
    const down = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const ch = data[i].close - data[i - 1].close;
      up[i] = ch > 0 ? ch : 0;
      down[i] = ch < 0 ? -ch : 0;
    }

    let sumUp = 0;
    let sumDown = 0;
    for (let i = 1; i < n; i++) {
      sumUp += up[i];
      sumDown += down[i];
      if (i > period) {
        sumUp -= up[i - period];
        sumDown -= down[i - period];
      }
      if (i >= period) {
        const denom = sumUp + sumDown;
        const cmo = denom > 0 ? (100 * (sumUp - sumDown)) / denom : 0;
        const val: IndicatorValue = { value: cmo };
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
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + 100) / 200);

    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [-50, 0, 50]) {
      const y = toY(level);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();
    }
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
