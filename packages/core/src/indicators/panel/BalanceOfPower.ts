import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Balance of Power (Igor Livshin) — measures the strength of buyers vs sellers
 * within each bar: (close − open) / (high − low), optionally SMA-smoothed.
 * Above zero = buyers dominate, below = sellers. Bounded roughly to [−1, 1].
 */
export class BalanceOfPowerIndicator extends IndicatorBase {
  descriptor = {
    id: 'bop',
    name: 'Balance of Power',
    placement: 'panel' as const,
    defaultConfig: { smooth: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const smooth = getIntParam(config, 'smooth', 14, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    const raw = new Array(n);
    for (let i = 0; i < n; i++) {
      const range = data[i].high - data[i].low;
      raw[i] = range > 0 ? (data[i].close - data[i].open) / range : 0;
    }

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += raw[i];
      if (i >= smooth) sum -= raw[i - smooth];
      if (i >= smooth - 1) {
        const val: IndicatorValue = { value: sum / smooth };
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
    // Fixed −1..1 scale (BOP is naturally bounded).
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + 1) / 2);
    const zeroY = toY(0);

    ctx.strokeStyle = style.colors[2] ?? '#787B86';
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
      const y = toY(Math.max(-1, Math.min(1, val.value)));
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
