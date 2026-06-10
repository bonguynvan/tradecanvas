import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState, TimeFrame } from '@tradecanvas/commons';
import { timeframeBucketStart } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Higher-timeframe moving average drawn on the current chart. Base bars are
 * grouped into buckets of the configured timeframe; the MA is a simple average
 * of *completed* higher-timeframe closes, so the value is flat within each
 * bucket and steps at its boundary — non-repainting (the in-progress HTF bar
 * never contributes until it closes).
 */
export class MTFMovingAverageIndicator extends IndicatorBase {
  descriptor = {
    id: 'mtfma',
    name: 'MTF Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 50, timeframe: '1d' },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 50, 1);
    const tf = String(config.params.timeframe ?? '1d') as TimeFrame;

    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    const completed: number[] = []; // closes of completed HTF buckets
    let currentKey = timeframeBucketStart(data[0].time, tf);
    let runningClose = data[0].close;
    let maForBucket: number | null = null;

    const recomputeMa = (): void => {
      if (completed.length < period) return;
      let sum = 0;
      for (let k = completed.length - period; k < completed.length; k++) sum += completed[k];
      maForBucket = sum / period;
    };

    for (let i = 0; i < data.length; i++) {
      const key = timeframeBucketStart(data[i].time, tf);
      if (key !== currentKey) {
        completed.push(runningClose); // prior bucket just closed
        recomputeMa();
        currentKey = key;
      }
      runningClose = data[i].close;
      if (maForBucket !== null) {
        const val: IndicatorValue = { value: maForBucket };
        values.set(data[i].time, val);
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

    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
