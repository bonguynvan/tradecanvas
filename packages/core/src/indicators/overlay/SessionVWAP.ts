import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { timeframeBucketStart } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Session VWAP — a volume-weighted average price that resets at the start of
 * each calendar day (UTC), the way intraday traders read it. Distinct from the
 * cumulative `vwap` (never resets) and `avwap` (manual anchor). Uses the
 * typical price (H+L+C)/3 weighted by volume.
 */
export class SessionVWAPIndicator extends IndicatorBase {
  descriptor = {
    id: 'svwap',
    name: 'Session VWAP',
    placement: 'overlay' as const,
    defaultConfig: {},
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    let sessionKey = timeframeBucketStart(data[0].time, '1d');
    let cumPV = 0;
    let cumV = 0;

    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      const key = timeframeBucketStart(bar.time, '1d');
      if (key !== sessionKey) {
        cumPV = 0;
        cumV = 0;
        sessionKey = key;
      }
      const typical = (bar.high + bar.low + bar.close) / 3;
      cumPV += typical * bar.volume;
      cumV += bar.volume;
      if (cumV > 0) {
        const val: IndicatorValue = { value: cumPV / cumV, session: sessionKey };
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

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';

    // Break the line at each session reset so days don't connect.
    let prevSession: number | undefined;
    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) { started = false; continue; }
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      const newSession = val.session !== prevSession;
      if (!started || newSession) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
      prevSession = val.session;
    }
    ctx.stroke();
  }
}
