import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { barTimeUnit, normalizeBarTime } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getNumberParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { LinePen, isDenseSlots } from '../linePen.js';
import { plotLook } from '../plots.js';

/**
 * Anchored VWAP — a VWAP from the bar at `params.anchorTime` on: a time in
 * milliseconds (one in seconds is read too), whichever unit the bars are
 * timed in. With no anchor, or one before the first bar, it runs over every
 * bar loaded (VWAP's `anchor: 'all'`).
 */
export class AnchoredVWAPIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'avwap',
    name: 'Anchored VWAP',
    placement: 'overlay' as const,
    defaultConfig: { anchorTime: 0 },
    shortName: 'AVWAP',
    plots: [{ key: 'value', title: 'AVWAP', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const anchorTime = getNumberParam(config, 'anchorTime', 0);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let anchorIdx = 0;
    if (anchorTime > 0) {
      // Both read in milliseconds: bars timed in seconds never reached an anchor in ms.
      const unit = barTimeUnit(data);
      const anchorMs = normalizeBarTime(anchorTime);
      anchorIdx = data.findIndex((b) => b.time * unit >= anchorMs);
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

    const look = plotLook(style, 'value', style.lineWidths[0]);
    if (!look.visible) return;
    const pen = new LinePen(ctx, style.colors[0], style.lineWidths[0], isDenseSlots(viewport), look.dash);
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      pen.add(x, y);
    }
    pen.finish();
  }
}
