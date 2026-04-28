import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getNumberParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Anchored VWAP — VWAP that resets at a chosen anchor.
 * Anchor is provided as a unix-ms timestamp via params.anchorTime.
 * If anchorTime is missing or precedes the dataset, behaves like regular VWAP.
 */
export class AnchoredVWAPIndicator extends IndicatorBase {
  descriptor = {
    id: 'avwap',
    name: 'Anchored VWAP',
    placement: 'overlay' as const,
    defaultConfig: { anchorTime: 0 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const anchorTime = getNumberParam(config, 'anchorTime', 0);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let anchorIdx = 0;
    if (anchorTime > 0) {
      anchorIdx = data.findIndex((b) => b.time >= anchorTime);
      if (anchorIdx < 0) return { values, series };
    }

    let cumVol = 0;
    let cumVolPrice = 0;
    for (let i = anchorIdx; i < data.length; i++) {
      const typical = (data[i].high + data[i].low + data[i].close) / 3;
      cumVol += data[i].volume;
      cumVolPrice += typical * data[i].volume;
      if (cumVol > 0) {
        const val: IndicatorValue = { value: cumVolPrice / cumVol };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void {
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
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}
