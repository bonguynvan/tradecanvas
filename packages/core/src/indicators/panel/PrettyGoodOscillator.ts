import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Pretty Good Oscillator (Mark Johnson) — the distance of the close from its
 * SMA, measured in units of Average True Range. Because it is ATR-normalised,
 * the ±3 reference levels mean the same thing across instruments: breakouts
 * trade above +3 / below −3, while reversions cross back through zero.
 *
 * PGO = (close − SMA(close, n)) / ATR(n)
 */
export class PrettyGoodOscillatorIndicator extends IndicatorBase {
  descriptor = {
    id: 'pgo',
    name: 'Pretty Good Oscillator',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= period) return { values, series };

    // Wilder-smoothed ATR.
    const tr = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (i === 0) { tr[i] = data[i].high - data[i].low; continue; }
      const pc = data[i - 1].close;
      tr[i] = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - pc), Math.abs(data[i].low - pc));
    }
    const atr = new Array(n).fill(undefined as number | undefined);
    let seed = 0;
    for (let i = 1; i <= period; i++) seed += tr[i];
    atr[period] = seed / period;
    for (let i = period + 1; i < n; i++) {
      atr[i] = (atr[i - 1]! * (period - 1) + tr[i]) / period;
    }

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;
      if (i >= period && atr[i] !== undefined && atr[i]! > 0) {
        const ma = sum / period;
        const val: IndicatorValue = { value: (data[i].close - ma) / atr[i]! };
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

    let absMax = 3;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i]?.value;
      if (v !== undefined && Math.abs(v) > absMax) absMax = Math.abs(v);
    }
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));

    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [-3, 0, 3]) {
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
