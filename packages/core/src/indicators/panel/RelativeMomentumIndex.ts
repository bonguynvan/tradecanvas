import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Relative Momentum Index (Roger Altman) — a generalisation of RSI that
 * compares the close to the close `momentum` bars ago instead of one bar ago,
 * then Wilder-smooths the up/down moves over `period`. Larger momentum lookback
 * yields a smoother, less twitchy 0–100 oscillator. 30 / 70 reference bands.
 */
export class RelativeMomentumIndexIndicator extends IndicatorBase {
  descriptor = {
    id: 'rmi',
    name: 'Relative Momentum Index',
    placement: 'panel' as const,
    defaultConfig: { period: 20, momentum: 5 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const mom = getIntParam(config, 'momentum', 5, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= period + mom) return { values, series };

    const closes = data.map((b) => b.close);
    const up: number[] = new Array(n).fill(0);
    const down: number[] = new Array(n).fill(0);
    for (let i = mom; i < n; i++) {
      const ch = closes[i] - closes[i - mom];
      up[i] = ch > 0 ? ch : 0;
      down[i] = ch < 0 ? -ch : 0;
    }

    // Wilder seed over the first `period` momentum-changes (indices mom..mom+period-1).
    let avgUp = 0;
    let avgDown = 0;
    const seedEnd = mom + period;
    for (let i = mom + 1; i <= seedEnd; i++) {
      avgUp += up[i];
      avgDown += down[i];
    }
    avgUp /= period;
    avgDown /= period;
    const emit = (i: number) => {
      const rmi = avgDown === 0 ? 100 : 100 - 100 / (1 + avgUp / avgDown);
      const val: IndicatorValue = { value: rmi };
      values.set(data[i].time, val);
      series[i] = val;
    };
    emit(seedEnd);
    for (let i = seedEnd + 1; i < n; i++) {
      avgUp = (avgUp * (period - 1) + up[i]) / period;
      avgDown = (avgDown * (period - 1) + down[i]) / period;
      emit(i);
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - v / 100);

    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [30, 70]) {
      const y = toY(level);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0] ?? '#2962FF';
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i];
      if (!v || v.value === undefined) { started = false; continue; }
      const x = barIndexToX(i, viewport);
      const y = toY(v.value);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
