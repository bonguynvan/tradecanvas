import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { lineDash } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { LinePen, isDenseSlots } from '../linePen.js';
import { breaksBetween, periodKeyer } from '../periods.js';

/**
 * Session VWAP — the session VWAP (`vwap`'s default anchor) with its bands:
 * a volume-weighted average of the typical price (H+L+C)/3 that starts again
 * each trading day, from midnight on the exchange's clock
 * (`config.exchangeTimeZone`, else UTC), the way intraday traders read it.
 * `avwap` starts at a bar you choose instead.
 *
 * `bands` (0–3) adds volume-weighted standard-deviation bands at ±1σ…±3σ around
 * the session VWAP — the classic VWAP band envelope.
 */
export class SessionVWAPIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'svwap',
    name: 'Session VWAP',
    placement: 'overlay' as const,
    defaultConfig: { bands: 1 },
    shortName: 'SVWAP',
    plots: [
      { key: 'value', title: 'VWAP', color: 0 },
      { key: 'u1', title: '+1σ', color: 1 },
      { key: 'l1', title: '−1σ', color: 1 },
      { key: 'u2', title: '+2σ', color: 1 },
      { key: 'l2', title: '−2σ', color: 1 },
      { key: 'u3', title: '+3σ', color: 1 },
      { key: 'l3', title: '−3σ', color: 1 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const bands = Math.min(3, getIntParam(config, 'bands', 1, 0));
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    const keyOf = periodKeyer(data, 'session', config.exchangeTimeZone);
    let sessionKey = keyOf(data[0].time);
    let cumPV = 0;
    let cumPV2 = 0;
    let cumV = 0;

    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      const key = keyOf(bar.time);
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

    // Bands first (fainter, behind the VWAP line), each session's apart: a
    // session of one bar, as on daily bars, holds them on its line (σ 0).
    const newSession = (a: number, b: number) => series[a]?.session !== series[b]?.session;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.strokeStyle = style.colors[1] ?? style.colors[0];
    // Each band dashed unless its plot style says otherwise, and left out when hidden.
    const band = (key: string) => {
      const own = style.plots?.[key];
      if (own?.visible === false) return;
      ctx.setLineDash(own?.lineStyle ? lineDash(own.lineStyle, [4, 3], 1) : [4, 3]);
      this.strokeBandSeries(ctx, series, viewport, from, to, (v) => v[key], newSession);
    };
    for (let b = 1; b <= 3; b++) {
      band(`u${b}`);
      band(`l${b}`);
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // VWAP line on top.
    const vwap = style.plots?.value;
    if (vwap?.visible === false) return;
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    ctx.setLineDash(lineDash(vwap?.lineStyle ?? 'solid', [6, 4], style.lineWidths[0]));
    this.strokeBandSeries(ctx, series, viewport, from, to, (v) => v.value, (a, b) => breaksBetween(series, a, b));
    ctx.setLineDash([]);
  }

  /**
   * Stroke one accessor's points, breaking the path between two bars where
   * `breaks` says so: the bands at every session reset, the line where
   * `breaksBetween` does (sessions of one bar each, as on daily bars, are
   * joined).
   */
  private strokeBandSeries(
    ctx: CanvasRenderingContext2D,
    series: (IndicatorValue | null)[],
    viewport: ViewportState,
    from: number,
    to: number,
    accessor: (v: IndicatorValue) => number | undefined,
    breaks: (a: number, b: number) => boolean,
  ): void {
    const pen = new LinePen(ctx, String(ctx.strokeStyle), ctx.lineWidth, isDenseSlots(viewport));
    let last = -1;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      const value = val ? accessor(val) : undefined;
      if (!val || value === undefined) {
        pen.gap();
        last = -1;
        continue;
      }
      if (last >= 0 && breaks(last, i)) pen.gap();
      pen.add(barIndexToX(i, viewport), priceToY(value, viewport));
      last = i;
    }
    pen.finish();
  }
}
