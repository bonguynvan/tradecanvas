import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { LinePen, isDenseSlots } from '../linePen.js';

export class VWAPIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    placement: 'overlay' as const,
    defaultConfig: {},
    shortName: 'VWAP',
    plots: [{ key: 'value', title: 'VWAP', color: 0 }],
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    let cumulativeVolume = 0;
    let cumulativeVolumePrice = 0;

    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      cumulativeVolume += data[i].volume;
      cumulativeVolumePrice += typicalPrice * data[i].volume;
      if (cumulativeVolume > 0) {
        const val: IndicatorValue = { value: cumulativeVolumePrice / cumulativeVolume };
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

    const pen = new LinePen(ctx, style.colors[0], style.lineWidths[0], isDenseSlots(viewport));
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
