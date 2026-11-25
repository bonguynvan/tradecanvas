import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { barDelta } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getNumberParam } from '../params.js';
import { periodKeyer } from '../periods.js';

/** Where the cumulative delta starts again: never (`'all'`, the default), or with each session, week or month. */
export const VOLUME_DELTA_ANCHORS = ['all', 'session', 'week', 'month'] as const;
type VolumeDeltaAnchor = (typeof VOLUME_DELTA_ANCHORS)[number];

/** The anchor `config` asks for; one it does not know is `'all'`. */
function readAnchor(config: IndicatorConfig): VolumeDeltaAnchor {
  const anchor = config.params.anchor;
  return (VOLUME_DELTA_ANCHORS as readonly unknown[]).includes(anchor) ? (anchor as VolumeDeltaAnchor) : 'all';
}

/**
 * Volume delta: what the buyers took of each bar less what the sellers
 * did. A bar that says who took its trades (`buyVolume`) gives its true
 * delta. One that does not is read from the way it closed: all of its
 * volume up when it closed at or over its open, down otherwise, which is
 * the nearest an OHLCV bar comes. `mode: 0` shows each bar's delta as a
 * histogram; `mode: 1` the running sum (the cumulative delta), started
 * again with each `anchor` period when one is given.
 */
export class VolumeDeltaIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'voldelta',
    name: 'Volume Delta',
    placement: 'panel' as const,
    defaultConfig: { mode: 0, anchor: 'all' },
    inputs: { mode: { kind: 'int', min: 0, max: 1, label: 'Cumulative' }, anchor: { options: VOLUME_DELTA_ANCHORS } },
    shortName: 'Vol Δ',
    plots: [{ key: 'value', title: 'Delta', color: 0, kind: 'histogram', tone: { field: 'up' }, downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const cumulative = getNumberParam(config, 'mode', 0) >= 1;
    const anchor = readAnchor(config);
    const keyOf = cumulative && anchor !== 'all' ? periodKeyer(data, anchor, config.exchangeTimeZone, config.sessionStart) : null;
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let running = 0;
    let period: number | null = null;
    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      // The bar's own count where it has one; else the way it closed.
      const delta = barDelta(bar) ?? (bar.close >= bar.open ? bar.volume : -bar.volume);
      if (keyOf) {
        const key = keyOf(bar.time);
        if (key !== period) running = 0;
        period = key;
      }
      running += delta;
      const val: IndicatorValue = {
        value: cumulative ? running : delta,
        up: delta >= 0 ? 1 : 0,
      };
      values.set(bar.time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
