import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { LinePen, isDenseSlots } from '../linePen.js';
import { plotLook } from '../plots.js';
import { breaksBetween, periodKeyer, type PeriodKeyer } from '../periods.js';

/** Where the average starts again: each trading day, each week, each month, or never (every bar loaded). */
export const VWAP_ANCHORS = ['session', 'week', 'month', 'all'] as const;
export type VWAPAnchor = (typeof VWAP_ANCHORS)[number];

/**
 * `barsAreDaily` reads the first 64 bars: until a series has more, a new bar
 * can change whether it is daily, and with it every period's key.
 */
const DAILY_SAMPLE_BARS = 64;

/** The anchor `config` asks for; one it does not know is the session. */
export function readAnchor(config: IndicatorConfig): VWAPAnchor {
  const anchor = config.params.anchor;
  return (VWAP_ANCHORS as readonly unknown[]).includes(anchor) ? (anchor as VWAPAnchor) : 'session';
}

/** The key of each bar's period for `config`'s anchor, or null for `'all'`. */
function keyerFor(data: DataSeries, config: IndicatorConfig): PeriodKeyer | null {
  const anchor = readAnchor(config);
  return anchor === 'all' ? null : periodKeyer(data, anchor, config.exchangeTimeZone);
}

/**
 * Volume-weighted average of the typical price (H+L+C)/3, from the start of
 * each period: the trading day by default (from midnight on the exchange's
 * clock, `config.exchangeTimeZone`), the week from Monday, the month from
 * the 1st, or every bar loaded (`'all'`).
 */
export class VWAPIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    placement: 'overlay' as const,
    defaultConfig: { anchor: 'session' },
    shortName: 'VWAP',
    inputs: { anchor: { options: VWAP_ANCHORS } },
    plots: [{ key: 'value', title: 'VWAP', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const out: IndicatorOutput = { values: new IndicatorValueMap(), series: new Array(data.length).fill(null) };
    this.fill(out, data, keyerFor(data, config), 0, 0);
    return out;
  }

  /**
   * On a tick or a new bar only the current period is summed again, from its
   * first bar: the bars before it are not in its average. `'all'` sums every
   * bar, so it is computed in full, as are the first bars of a series.
   */
  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const keyOf = keyerFor(data, config);
    if (!keyOf || from < DAILY_SAMPLE_BARS || from >= data.length || !this.canResume(data, prev, from)) return null;
    const key = keyOf(data[from].time);
    let start = from;
    while (start > 0 && keyOf(data[start - 1].time) === key) start--;
    prev.series!.length = data.length;
    this.fill(prev, data, keyOf, start, from);
    return prev;
  }

  /** Sum from bar `start` (a period's first bar, or 0) and write the points from `writeFrom` on. */
  private fill(out: IndicatorOutput, data: DataSeries, keyOf: PeriodKeyer | null, start: number, writeFrom: number): void {
    let period: number | undefined;
    let volume = 0;
    let volumePrice = 0;
    for (let i = start; i < data.length; i++) {
      const bar = data[i];
      if (keyOf) {
        const key = keyOf(bar.time);
        if (key !== period) {
          volume = 0;
          volumePrice = 0;
          period = key;
        }
      }
      volume += bar.volume;
      volumePrice += ((bar.high + bar.low + bar.close) / 3) * bar.volume;
      if (i < writeFrom) continue;
      // The period rides along, not drawn, so the line breaks where it starts again.
      const val: IndicatorValue | null = volume > 0
        ? (period === undefined ? { value: volumePrice / volume } : { value: volumePrice / volume, session: period })
        : null;
      this.writePoint(out, data, i, val);
    }
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const look = plotLook(style, 'value', style.lineWidths[0]);
    if (!look.visible) return;
    const pen = new LinePen(ctx, style.colors[0], style.lineWidths[0], isDenseSlots(viewport), look.dash);
    let last = -1;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      if (last >= 0 && breaksBetween(series, last, i)) pen.gap();
      pen.add(barIndexToX(i, viewport), priceToY(val.value, viewport));
      last = i;
    }
    pen.finish();
  }
}
