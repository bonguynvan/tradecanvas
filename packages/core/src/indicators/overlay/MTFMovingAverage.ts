import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, TimeFrame } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { periodKeyer } from '../periods.js';

/**
 * Higher-timeframe moving average drawn on the current chart. Base bars are
 * grouped into buckets of the configured timeframe; the MA is a simple average
 * of *completed* higher-timeframe closes, so the value is flat within each
 * bucket and steps at its boundary — non-repainting (the in-progress HTF bar
 * never contributes until it closes). Days, weeks, months and the hour
 * frames that divide a day (2h to 12h) start at midnight on the exchange's
 * clock (`config.exchangeTimeZone`), as VWAP's do: in Ho Chi Minh City a 4h
 * frame steps at 01:00, 05:00… UTC. A feed's own 4h bars stay on UTC's grid
 * (00:00, 04:00…), so in a zone whose midnight falls between UTC's 4-hour
 * marks (Ho Chi Minh City, Tokyo, New York in winter) the 4h line steps at
 * other hours than such a feed's 4h candles.
 */
export class MTFMovingAverageIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    readsExchangeTimeZone: true,
    id: 'mtfma',
    name: 'MTF Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 50, timeframe: '1d', source: 'close' },
    shortName: 'MTF MA',
    inputs: { source: { source: true }, period: { kind: 'int', min: 1 } },
    plots: [{ key: 'value', title: 'MA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 50, 1);
    const tf = String(config.params.timeframe ?? '1d') as TimeFrame;

    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    const completed: number[] = []; // closes of completed HTF buckets
    const keyOf = periodKeyer(data, tf, config.exchangeTimeZone);
    let currentKey = keyOf(data[0].time);
    let runningClose = data[0].close;
    let maForBucket: number | null = null;

    const recomputeMa = (): void => {
      if (completed.length < period) return;
      let sum = 0;
      for (let k = completed.length - period; k < completed.length; k++) sum += completed[k];
      maForBucket = sum / period;
    };

    for (let i = 0; i < data.length; i++) {
      const key = keyOf(data[i].time);
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
}
