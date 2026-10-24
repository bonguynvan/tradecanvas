import { Chart, IndicatorBase, IndicatorValueMap, type OHLCBar } from '@tradecanvas/chart';
import type { DataSeries, IndicatorDescriptor, IndicatorOutput, IndicatorValue } from '@tradecanvas/chart';

class RangePercent extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rangePercent',
    name: 'Range %',
    shortName: 'Range %',
    placement: 'panel',
    defaultConfig: {},
    plots: [{ key: 'value', title: 'Range %', color: 0 }],
  };

  calculate(data: DataSeries): IndicatorOutput {
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = data.map((bar) => {
      const point = { value: ((bar.high - bar.low) / bar.close) * 100 };
      values.set(bar.time, point);
      return point;
    });
    return { values, series };
  }
}

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  chart.registerIndicator(new RangePercent());
  chart.addIndicator('rangePercent');
  return chart;
}
