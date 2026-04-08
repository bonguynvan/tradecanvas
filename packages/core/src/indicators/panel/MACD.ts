import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class MACDIndicator extends IndicatorBase {
  descriptor = {
    id: 'macd',
    name: 'MACD',
    placement: 'panel' as const,
    defaultConfig: { fast: 12, slow: 26, signal: 9 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = config.params.fast as number;
    const slow = config.params.slow as number;
    const signalPeriod = config.params.signal as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length < slow) return { values, series };

    // Compute EMA incrementally without storing full arrays
    const fastMult = 2 / (fast + 1);
    const slowMult = 2 / (slow + 1);
    const signalMult = 2 / (signalPeriod + 1);

    let fastEma = data[0].close;
    let slowEma = data[0].close;
    let sig = 0;
    let sigStarted = false;

    for (let i = 0; i < data.length; i++) {
      const c = data[i].close;
      if (i === 0) { fastEma = c; slowEma = c; }
      else { fastEma = (c - fastEma) * fastMult + fastEma; slowEma = (c - slowEma) * slowMult + slowEma; }

      if (i >= slow - 1) {
        const macd = fastEma - slowEma;
        if (!sigStarted) { sig = macd; sigStarted = true; }
        else { sig = (macd - sig) * signalMult + sig; }
        const histogram = macd - sig;
        const val: IndicatorValue = { macd, signal: sig, histogram };
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

    // Find range for scaling — single pass
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      if (val.macd !== undefined) { if (val.macd < minVal) minVal = val.macd; if (val.macd > maxVal) maxVal = val.macd; }
      if (val.signal !== undefined) { if (val.signal < minVal) minVal = val.signal; if (val.signal > maxVal) maxVal = val.signal; }
      if (val.histogram !== undefined) { if (val.histogram < minVal) minVal = val.histogram; if (val.histogram > maxVal) maxVal = val.histogram; }
    }
    if (minVal === Infinity) return;
    const range = maxVal - minVal || 1;

    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v - minVal) / range);
    const zeroY = toY(0);
    const halfBar = viewport.barWidth / 2;

    // Single pass: histogram + collect MACD/signal points
    const posColor = style.colors[2] ?? '#26A69A';
    const negColor = style.colors[3] ?? '#EF5350';
    const macdColor = style.colors[0];
    const signalColor = style.colors[1] ?? '#FF9800';

    // Histogram — batch by color: two paths
    ctx.beginPath();
    const posPath = new Path2D();
    const negPath = new Path2D();

    let macdStarted = false;
    let sigStarted = false;
    const macdPath = new Path2D();
    const sigPath = new Path2D();

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      const x = barIndexToX(i, viewport);

      if (val.histogram !== undefined) {
        const y = toY(val.histogram);
        const top = Math.min(y, zeroY);
        const h = Math.max(Math.abs(y - zeroY), 1);
        if (val.histogram >= 0) posPath.rect(x - halfBar, top, viewport.barWidth, h);
        else negPath.rect(x - halfBar, top, viewport.barWidth, h);
      }

      if (val.macd !== undefined) {
        const y = toY(val.macd);
        if (!macdStarted) { macdPath.moveTo(x, y); macdStarted = true; }
        else macdPath.lineTo(x, y);
      }
      if (val.signal !== undefined) {
        const y = toY(val.signal);
        if (!sigStarted) { sigPath.moveTo(x, y); sigStarted = true; }
        else sigPath.lineTo(x, y);
      }
    }

    // Draw histogram
    ctx.fillStyle = posColor;
    ctx.fill(posPath);
    ctx.fillStyle = negColor;
    ctx.fill(negPath);

    // Draw lines
    ctx.strokeStyle = macdColor;
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    ctx.stroke(macdPath);

    ctx.strokeStyle = signalColor;
    ctx.stroke(sigPath);
  }
}
