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

/** The period's sums through bar `index`, from its first bar: volume, and volume times the typical price. */
interface RunningSums {
  index: number;
  volume: number;
  volumePrice: number;
}

/**
 * The sums are kept through an output's last two bars: a tick, or the last
 * bar closing as a new one comes, resumes from the one before the last;
 * bars added after the last, from the last.
 */
const KEPT_BARS = 2;

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
    readsExchangeTimeZone: true,
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    placement: 'overlay' as const,
    defaultConfig: { anchor: 'session' },
    shortName: 'VWAP',
    inputs: { anchor: { options: VWAP_ANCHORS } },
    plots: [{ key: 'value', title: 'VWAP', color: 0 }],
  };

  /** The running sums through each output's last bars, which the average alone cannot be turned back into. */
  private kept = new WeakMap<IndicatorOutput, RunningSums[]>();

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const out: IndicatorOutput = { values: new IndicatorValueMap(), series: new Array(data.length).fill(null) };
    const keyOf = keyerFor(data, config);
    const kept = this.fill(out, data, keyOf, 0, null);
    // 'all' is never resumed.
    if (keyOf) this.kept.set(out, kept);
    return out;
  }

  /**
   * On a tick or a new bar, each changed bar is added to the sums kept for
   * the bar before it: the period's earlier bars are not read again. `'all'`
   * is computed in full, as are the first bars of a series and a change
   * further back than the last two bars.
   */
  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const keyOf = keyerFor(data, config);
    const kept = this.kept.get(prev) ?? [];
    const resume = kept.find((sums) => sums.index === from - 1);
    if (!keyOf || !resume || from < DAILY_SAMPLE_BARS || from >= data.length || !this.canResume(data, prev, from)) return null;
    prev.series!.length = data.length;
    const tail = this.fill(prev, data, keyOf, from, resume);
    // The bars before `from` are as they were, and so are their sums.
    const before = kept.filter((sums) => sums.index < from && sums.index >= data.length - KEPT_BARS);
    this.kept.set(prev, [...before, ...tail]);
    return prev;
  }

  /**
   * Sum on from bar `from`, from the sums through the bar before it (`resume`;
   * none at 0), and write each point. Gives the sums through the last bars.
   */
  private fill(out: IndicatorOutput, data: DataSeries, keyOf: PeriodKeyer | null, from: number, resume: RunningSums | null): RunningSums[] {
    let period = resume && keyOf ? keyOf(data[resume.index].time) : undefined;
    let volume = resume?.volume ?? 0;
    let volumePrice = resume?.volumePrice ?? 0;
    const kept: RunningSums[] = [];
    for (let i = from; i < data.length; i++) {
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
      if (i >= data.length - KEPT_BARS) kept.push({ index: i, volume, volumePrice });
      // The period rides along, not drawn, so the line breaks where it starts again.
      const val: IndicatorValue | null = volume > 0
        ? (period === undefined ? { value: volumePrice / volume } : { value: volumePrice / volume, session: period })
        : null;
      this.writePoint(out, data, i, val);
    }
    return kept;
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
