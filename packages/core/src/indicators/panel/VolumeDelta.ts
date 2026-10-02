import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getNumberParam } from '../params.js';

/**
 * Directional volume ("volume delta") panel. Approximates buy/sell pressure
 * from OHLCV: a bar that closes at or above its open contributes positive
 * volume, otherwise negative. `mode: 0` shows the per-bar delta histogram;
 * `mode: 1` shows the cumulative delta line. (A true tick-delta needs per-trade
 * bid/ask data, which an OHLCV series doesn't carry.)
 */
export class VolumeDeltaIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'voldelta',
    name: 'Volume Delta',
    placement: 'panel' as const,
    defaultConfig: { mode: 0 },
    shortName: 'Vol Δ',
    plots: [{ key: 'value', title: 'Delta', color: 0, kind: 'histogram', tone: { field: 'up' }, downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const cumulative = getNumberParam(config, 'mode', 0) >= 1;
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let running = 0;
    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      const up = bar.close >= bar.open;
      const delta = up ? bar.volume : -bar.volume;
      running += delta;
      const val: IndicatorValue = {
        value: cumulative ? running : delta,
        up: up ? 1 : 0,
      };
      values.set(bar.time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
