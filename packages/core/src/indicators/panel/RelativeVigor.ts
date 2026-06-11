import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Relative Vigor Index (John Ehlers) — gauges trend conviction on the premise
 * that in an uptrend price closes higher than it opens (and vice-versa),
 * normalised by the bar range and symmetrically (1-2-2-1) smoothed. RVI
 * crossing its signal line flags momentum shifts. Oscillates around zero.
 */
export class RelativeVigorIndicator extends IndicatorBase {
  descriptor = {
    id: 'rvi',
    name: 'Relative Vigor Index',
    placement: 'panel' as const,
    defaultConfig: { period: 10 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 10, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period + 3) return { values, series };

    const num = new Array(n).fill(0); // close − open
    const den = new Array(n).fill(0); // high − low
    for (let i = 0; i < n; i++) {
      num[i] = data[i].close - data[i].open;
      den[i] = data[i].high - data[i].low;
    }

    // Symmetric (1,2,2,1)/6 weighting.
    const sw = (arr: number[], i: number): number =>
      (arr[i] + 2 * arr[i - 1] + 2 * arr[i - 2] + arr[i - 3]) / 6;

    const numS = new Array(n).fill(undefined as number | undefined);
    const denS = new Array(n).fill(undefined as number | undefined);
    for (let i = 3; i < n; i++) {
      numS[i] = sw(num, i);
      denS[i] = sw(den, i);
    }

    // RVI = SMA(numS, period) / SMA(denS, period).
    const rvi = new Array(n).fill(undefined as number | undefined);
    for (let i = 3 + period - 1; i < n; i++) {
      let ns = 0;
      let ds = 0;
      for (let j = i - period + 1; j <= i; j++) {
        ns += numS[j]!;
        ds += denS[j]!;
      }
      rvi[i] = ds !== 0 ? ns / ds : 0;
    }

    for (let i = 0; i < n; i++) {
      if (rvi[i] === undefined) continue;
      const val: IndicatorValue = { value: rvi[i] };
      if (i >= 3 && rvi[i - 3] !== undefined) {
        val.signal = (rvi[i]! + 2 * rvi[i - 1]! + 2 * rvi[i - 2]! + rvi[i - 3]!) / 6;
      }
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;

    let absMax = 0;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i];
      if (!v) continue;
      for (const k of ['value', 'signal'] as const) {
        const x = v[k];
        if (x !== undefined && Math.abs(x) > absMax) absMax = Math.abs(x);
      }
    }
    if (absMax === 0) return;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));

    const zeroY = toY(0);
    ctx.strokeStyle = style.colors[2] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, zeroY);
    ctx.lineTo(chartRect.x + chartRect.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawLine = (key: 'value' | 'signal', color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = style.lineWidths[0];
      ctx.lineJoin = 'round';
      let started = false;
      for (let i = from; i <= to && i < series.length; i++) {
        const val = series[i];
        if (!val || val[key] === undefined) { started = false; continue; }
        const x = barIndexToX(i, viewport);
        const y = toY(val[key]!);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('value', style.colors[0] ?? '#2962FF');
    drawLine('signal', style.colors[1] ?? '#FF9800');
  }
}
