import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorRenderContext, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam, getNumberParam } from '../params.js';
import { barIndexToX, priceToYMapper } from '../../viewport/ScaleMapping.js';
import { profileRowAlpha } from '../../style/profileRows.js';
import { resumeSessionProfiles, sessionVolumeRules, type SessionVolumeProfile, type SessionVolumeRules } from './sessionVolumeProfiles.js';

/** The busiest row of a day reaches this share of the day's width. */
const DAY_WIDTH_SHARE = 0.7;
/** Rows outside the value area are fainter than those in it. */
const OUTSIDE_FADE = 0.5;

const sameRules = (a: SessionVolumeRules, b: SessionVolumeRules): boolean =>
  a.rows === b.rows && a.valueArea === b.valueArea && a.timeZone === b.timeZone;

/** A bar's point: its day's POC and value area, and the day it is in, where the lines break. */
const pointOf = (p: SessionVolumeProfile): IndicatorValue => ({ poc: p.poc, vah: p.valueAreaHigh, val: p.valueAreaLow, session: p.start });

/**
 * Session volume profile: each trading day's volume by price, drawn as rows
 * growing right from the day's first bar, with the day's POC and value area
 * as lines across it. A day starts at midnight on the exchange's clock.
 * `rows` splits each day's range; `valueArea` (percent, 70) is the share of
 * its volume the value area holds. Each bar's `poc`, `vah` and `val` are its
 * whole day's, the bars after it included: on a past day a morning bar
 * carries the day's closing profile, and on the day still trading they move
 * as it trades. They are for reading a day, not for signals or a backtest
 * at that bar.
 * `sessionVolumeProfiles` gives the rows with no chart.
 */
export class SessionVolumeProfileIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    readsExchangeTimeZone: true,
    id: 'svp',
    name: 'Session Volume Profile',
    placement: 'overlay',
    defaultConfig: { rows: 24, valueArea: 70 },
    inputs: { rows: { kind: 'int', min: 1, max: 200 }, valueArea: { kind: 'number', min: 1, max: 100, step: 1 } },
    shortName: 'SVP',
    plots: [
      { key: 'poc', title: 'POC', color: 0, breakOn: 'session' },
      { key: 'vah', title: 'VAH', color: 1, width: 1, lineStyle: 'dashed', breakOn: 'session' },
      { key: 'val', title: 'VAL', color: 1, width: 1, lineStyle: 'dashed', breakOn: 'session' },
    ],
  };

  private rulesOf(config: IndicatorConfig): SessionVolumeRules {
    return sessionVolumeRules({
      rows: getIntParam(config, 'rows', 24, 1),
      valueArea: getNumberParam(config, 'valueArea', 70),
      timeZone: config.exchangeTimeZone ?? null,
    });
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const rules = this.rulesOf(config);
    const profiles: SessionVolumeProfile[] = [];
    resumeSessionProfiles(data, profiles, 0, rules);
    const out: IndicatorOutput = { values: new IndicatorValueMap(), series: new Array<IndicatorValue | null>(data.length).fill(null), meta: { profiles, rules } };
    this.writeDays(out, data, profiles, 0);
    return out;
  }

  /** A tick works out again the day it is in, and the days after: the days before are as they were. */
  revisesBefore(): number {
    // The bars of the day before `from` take the day's new lines, and a day's bars are as many as its timeframe
    // makes them: a reader of this line starts again from the first bar (the engine takes the most with Math.max).
    return Number.POSITIVE_INFINITY;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const meta = prev.meta as { profiles?: SessionVolumeProfile[]; rules?: SessionVolumeRules } | undefined;
    const rules = this.rulesOf(config);
    if (!meta?.profiles || !meta.rules || !sameRules(meta.rules, rules) || !prev.series || !this.canResume(data, prev, from)) return null;
    const profiles = meta.profiles;
    // The bars from the first day worked out again on: their points, the old ones taken off first.
    const first = resumeSessionProfiles(data, profiles, from, rules);
    for (let i = first; i < prev.series.length; i++) if (prev.series[i] && i < data.length) this.writePoint(prev, data, i, null);
    prev.series.length = data.length;
    for (let i = first; i < data.length; i++) prev.series[i] = null;
    this.writeDays(prev, data, profiles, first);
    prev.meta = { profiles, rules };
    return prev;
  }

  /** Each bar's point from `from` on: its day's lines, written in the bars' order as the value map keeps them best. */
  private writeDays(out: IndicatorOutput, data: DataSeries, profiles: readonly SessionVolumeProfile[], from: number): void {
    let k = profiles.length;
    while (k > 0 && profiles[k - 1].end >= from) k--;
    for (; k < profiles.length; k++) {
      const p = profiles[k];
      const point = pointOf(p);
      for (let i = Math.max(from, p.start); i <= p.end; i++) this.writePoint(out, data, i, point);
    }
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle, context?: IndicatorRenderContext): void {
    const profiles = output.meta?.profiles as readonly SessionVolumeProfile[] | undefined;
    if (profiles && profiles.length > 0) this.drawRows(ctx, profiles, viewport, style);
    super.render(ctx, output, viewport, style, context);
  }

  /** Each day in view: its rows from its first bar, as long as their volume against the day's busiest. */
  private drawRows(ctx: CanvasRenderingContext2D, profiles: readonly SessionVolumeProfile[], viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const firstBar = Math.floor(viewport.visibleRange.from);
    const lastBar = Math.ceil(viewport.visibleRange.to);
    const half = viewport.barWidth / 2;
    const toY = priceToYMapper(viewport);
    const inArea = style.colors[1] ?? style.colors[0];
    const alpha = ctx.globalAlpha * profileRowAlpha(style.opacity);
    ctx.save();
    for (let k = profiles.length - 1; k >= 0; k--) {
      const p = profiles[k];
      if (p.end < firstBar) break;
      if (p.start > lastBar) continue;
      const busiest = Math.max(...p.volumes);
      if (!(busiest > 0)) continue;
      const x0 = barIndexToX(p.start, viewport) - half;
      const reach = (barIndexToX(p.end, viewport) + half - x0) * DAY_WIDTH_SHARE;
      for (let r = 0; r < p.volumes.length; r++) {
        const width = (p.volumes[r] / busiest) * reach;
        if (width <= 0) continue;
        const yA = toY(p.low + r * p.rowHeight);
        const yB = toY(p.low + (r + 1) * p.rowHeight);
        const inside = r >= p.valueAreaRows[0] && r <= p.valueAreaRows[1];
        ctx.fillStyle = inArea;
        ctx.globalAlpha = alpha * (inside ? 1 : OUTSIDE_FADE);
        ctx.fillRect(x0, Math.min(yA, yB), width, Math.max(Math.abs(yA - yB) - 1, 1));
      }
    }
    ctx.restore();
  }
}
