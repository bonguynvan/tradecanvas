import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { timeframeBucketStart } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Session VWAP — a volume-weighted average price that resets at the start of
 * each calendar day (UTC), the way intraday traders read it. Distinct from the
 * cumulative `vwap` (never resets) and `avwap` (manual anchor). Uses the
 * typical price (H+L+C)/3 weighted by volume.
 *
 * `bands` (0–3) adds volume-weighted standard-deviation bands at ±1σ…±3σ around
 * the session VWAP — the classic VWAP band envelope.
 */
export class SessionVWAPIndicator extends IndicatorBase {
  descriptor = {
    id: 'svwap',
    name: 'Session VWAP',
    placement: 'overlay' as const,
    defaultConfig: { bands: 1 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const bands = Math.min(3, getIntParam(config, 'bands', 1, 0));
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    let sessionKey = timeframeBucketStart(data[0].time, '1d');
    let cumPV = 0;
    let cumPV2 = 0;
    let cumV = 0;

    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      const key = timeframeBucketStart(bar.time, '1d');
      if (key !== sessionKey) {
        cumPV = 0;
        cumPV2 = 0;
        cumV = 0;
        sessionKey = key;
      }
      const typical = (bar.high + bar.low + bar.close) / 3;
      cumPV += typical * bar.volume;
      cumPV2 += typical * typical * bar.volume;
      cumV += bar.volume;
      if (cumV > 0) {
        const vwap = cumPV / cumV;
        const val: IndicatorValue = { value: vwap, session: sessionKey };
        if (bands > 0) {
          const variance = Math.max(0, cumPV2 / cumV - vwap * vwap);
          const sd = Math.sqrt(variance);
          for (let b = 1; b <= bands; b++) {
            val[`u${b}`] = vwap + b * sd;
            val[`l${b}`] = vwap - b * sd;
          }
        }
        values.set(bar.time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    // Bands first (fainter, behind the VWAP line).
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = style.colors[1] ?? style.colors[0];
    for (let b = 1; b <= 3; b++) {
      this.strokeBandSeries(ctx, series, viewport, from, to, (v) => v[`u${b}`]);
      this.strokeBandSeries(ctx, series, viewport, from, to, (v) => v[`l${b}`]);
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // VWAP line on top.
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    this.strokeBandSeries(ctx, series, viewport, from, to, (v) => v.value);
  }

  /** Stroke a single series accessor, breaking the path at each session reset. */
  private strokeBandSeries(
    ctx: CanvasRenderingContext2D,
    series: (IndicatorValue | null)[],
    viewport: ViewportState,
    from: number,
    to: number,
    accessor: (v: IndicatorValue) => number | undefined,
  ): void {
    ctx.beginPath();
    let prevSession: number | undefined;
    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      const value = val ? accessor(val) : undefined;
      if (val === null || value === undefined) { started = false; continue; }
      const x = barIndexToX(i, viewport);
      const y = priceToY(value, viewport);
      const newSession = val.session !== prevSession;
      if (!started || newSession) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
      prevSession = val.session;
    }
    ctx.stroke();
  }
}
