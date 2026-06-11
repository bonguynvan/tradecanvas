import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Williams Accumulation/Distribution (Larry Williams) — a cumulative line that
 * adds the move from the "true range low" on up-closes and subtracts the move
 * from the "true range high" on down-closes. Divergence between WAD and price
 * signals accumulation or distribution ahead of a turn.
 */
export class WilliamsADIndicator extends IndicatorBase {
  descriptor = {
    id: 'wad',
    name: 'Williams A/D',
    placement: 'panel' as const,
    defaultConfig: {},
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    let wad = 0;
    values.set(data[0].time, { value: 0 });
    series[0] = { value: 0 };
    for (let i = 1; i < n; i++) {
      const pc = data[i - 1].close;
      const close = data[i].close;
      if (close > pc) wad += close - Math.min(data[i].low, pc);
      else if (close < pc) wad += close - Math.max(data[i].high, pc);
      const val: IndicatorValue = { value: wad };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    drawCumulativeLine(ctx, output, viewport, style, barIndexToX);
  }
}

/** Shared: a single line auto-scaled to the visible min/max (for cumulative series). */
export function drawCumulativeLine(
  ctx: CanvasRenderingContext2D,
  output: IndicatorOutput,
  viewport: ViewportState,
  style: ResolvedIndicatorStyle,
  toX: (i: number, vp: ViewportState) => number,
): void {
  const series = output.series;
  if (!series) return;
  const { chartRect } = viewport;
  const { from, to } = viewport.visibleRange;

  let min = Infinity;
  let max = -Infinity;
  for (let i = from; i <= to && i < series.length; i++) {
    const v = series[i]?.value;
    if (v === undefined) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return;
  const span = max - min || 1;
  const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v - min) / span);

  ctx.beginPath();
  ctx.strokeStyle = style.colors[0];
  ctx.lineWidth = style.lineWidths[0];
  ctx.lineJoin = 'round';
  let started = false;
  for (let i = from; i <= to && i < series.length; i++) {
    const val = series[i];
    if (!val || val.value === undefined) continue;
    const x = toX(i, viewport);
    const y = toY(val.value);
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
