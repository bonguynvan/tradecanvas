import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Ease of Movement (Richard Arms) — relates the day's midpoint move to its
 * volume to show how much volume it took to move price. High positive = price
 * rising on light volume (easy); negative = falling easily. SMA-smoothed,
 * zero-centered.
 *
 * EMV = SMA( midpointMove · (high − low) / volume , period ).
 */
export class EaseOfMovementIndicator extends IndicatorBase {
  descriptor = {
    id: 'emv',
    name: 'Ease of Movement',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const raw = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const mid = (data[i].high + data[i].low) / 2;
      const prevMid = (data[i - 1].high + data[i - 1].low) / 2;
      const range = data[i].high - data[i].low;
      const vol = data[i].volume;
      raw[i] = vol > 0 ? ((mid - prevMid) * range) / vol : 0;
    }

    let sum = 0;
    for (let i = 1; i < n; i++) {
      sum += raw[i];
      if (i > period) sum -= raw[i - period];
      if (i >= period) {
        const val: IndicatorValue = { value: sum / period };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    drawZeroCenteredLine(ctx, output, viewport, style);
  }
}

/** Shared: a single zero-centered, auto-scaled line with a dashed zero axis. */
export function drawZeroCenteredLine(
  ctx: CanvasRenderingContext2D,
  output: IndicatorOutput,
  viewport: ViewportState,
  style: ResolvedIndicatorStyle,
): void {
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
