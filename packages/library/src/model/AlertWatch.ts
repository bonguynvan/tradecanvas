import { readAlertOptions, type AlertManager, type PriceAlert } from '@tradecanvas/core';
import type { IndicatorOutput } from '@tradecanvas/commons';

/** What checking the alerts needs of them. */
export type WatchedAlerts = Pick<AlertManager, 'getAlerts' | 'setBarTime' | 'checkChannels' | 'checkDrawings'>;

/** An indicator's values at each bar, by its id (undefined: no such indicator). */
export type IndicatorLines = (instanceId: string) => IndicatorOutput['series'];

/** A moment the alerts are checked at. */
export interface AlertMoment {
  /** The live price. */
  price: number;
  /** The time of the latest live bar; null with none. */
  barTime: number | null;
  /** The indicators' lines, or null when alerts on them wait (a replay, no bars). */
  lines: IndicatorLines | null;
}

/**
 * Alerts against a live price, and against the indicator lines they watch,
 * all as of the same moment (a line crossing another compares like with
 * like). A line against a line fires only with both of this moment.
 */
export function checkAlerts(alerts: WatchedAlerts, moment: AlertMoment): void {
  alerts.setBarTime(moment.barTime);
  const values = new Map<string, number>([['price', moment.price]]);
  if (moment.lines) collectLineValues(alerts.getAlerts(), moment.lines, values);
  alerts.checkChannels(values, { together: true });
  alerts.checkDrawings(moment.price);
}

/**
 * The latest values of the indicator lines alerts watch or compare with.
 * Channel format: `<instanceId>:<key>`; instanceIds are `tc_<id>_<n>` and
 * built-in keys are colon-free, so the first colon splits them. Values come
 * from the recalculated series, so indicator alerts evaluate at bar cadence
 * (the live intrabar tick doesn't repaint closed-bar indicator values).
 * Cheap: only walks alerts whose channel isn't `'price'`, usually none.
 */
function collectLineValues(alerts: readonly PriceAlert[], lines: IndicatorLines, into: Map<string, number>): void {
  const channels = alerts.flatMap((a) => (a.target ? [a.channel, a.target] : [a.channel]));
  for (const channel of channels) {
    if (into.has(channel)) continue;
    const sep = channel.indexOf(':');
    if (sep < 0) continue;
    // The line's last value: at the last bar, or on Renko and the like the last brick.
    const series = lines(channel.slice(0, sep));
    const point = series?.[series.length - 1];
    const value = point?.[channel.slice(sep + 1)];
    if (typeof value === 'number' && Number.isFinite(value)) into.set(channel, value);
  }
}

/** What moving alerts to other indicators needs of them. */
export type MovedAlerts = Pick<AlertManager, 'getAlerts' | 'removeAlert' | 'addAlert'>;

/**
 * Alerts on the lines of indicators that went (`before`: id → kind) move to
 * the one new indicator of the same kind (`added`), when there is just one;
 * others stay as they are, as alerts on a removed indicator do. `kindOf` is
 * an indicator's kind now, undefined for one not on the chart.
 */
export function moveAlertsToHeirs(
  alerts: MovedAlerts,
  before: ReadonlyMap<string, string>,
  added: readonly string[],
  kindOf: (instanceId: string) => string | undefined,
): void {
  // A channel on a replaced indicator → the one new indicator of its kind (or null: leave it).
  const heirOf = (channel: string): string | null => {
    const sep = channel.indexOf(':');
    if (sep <= 0) return null;
    const from = channel.slice(0, sep);
    const kind = before.get(from);
    if (!kind || kindOf(from) !== undefined) return null;
    const heirs = added.filter((id) => kindOf(id) === kind);
    return heirs.length === 1 ? heirs[0] + channel.slice(sep) : null;
  };
  for (const alert of alerts.getAlerts()) {
    const channel = heirOf(alert.channel);
    const target = alert.target ? heirOf(alert.target) : null;
    if (!channel && !target) continue;
    const { percent, bars, onBarClose, expiresAt } = alert;
    alerts.removeAlert(alert.id);
    alerts.addAlert(alert.price, alert.condition, alert.message, alert.repeating, channel ?? alert.channel, alert.label, {
      ...(alert.target ? { target: target ?? alert.target } : {}),
      ...(percent !== undefined ? { percent } : {}),
      ...(bars !== undefined ? { bars } : {}),
      ...(onBarClose ? { onBarClose } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    });
  }
}

/** A `<instanceId>:<key>` channel following its indicator to its new id (`ids`: old → new); others as they are. */
export function followChannel(channel: string, ids: ReadonlyMap<string, string>): string {
  const sep = channel.indexOf(':');
  const renamed = sep > 0 ? ids.get(channel.slice(0, sep)) : undefined;
  return renamed ? renamed + channel.slice(sep) : channel;
}

/** What putting a layout's alerts back needs of them. */
export type RestoredAlerts = Pick<AlertManager, 'clearAlerts' | 'addAlert' | 'addDrawingAlert'>;

const DRAWING_CONDITIONS: readonly PriceAlert['condition'][] = ['crossing', 'crossingUp', 'crossingDown'];

/**
 * A layout's alerts in place of the chart's: their lines following the
 * indicators to their new ids (`ids`), an alert on a drawing only when the
 * drawing has a line to cross (`crossable`). A one-shot alert that already
 * fired stays fired (as AlertManager's own storage does), an expired one
 * stays gone, and one that no longer fits together goes to `leftOut`.
 */
export function restoreLayoutAlerts(
  alerts: RestoredAlerts,
  saved: readonly PriceAlert[],
  ids: ReadonlyMap<string, string>,
  crossable: (drawingId: string) => boolean,
  leftOut: (error: unknown) => void,
): void {
  alerts.clearAlerts();
  for (const a of saved) {
    if (a.triggered && !a.repeating) continue;
    if (a.expired) continue;
    if (a.drawingId) {
      if (crossable(a.drawingId) && DRAWING_CONDITIONS.includes(a.condition)) {
        alerts.addDrawingAlert(a.drawingId, a.condition, a.message, a.repeating, a.label);
      }
      continue;
    }
    const options = { ...readAlertOptions(a as unknown as Record<string, unknown>), ...(a.target ? { target: followChannel(a.target, ids) } : {}) };
    try {
      alerts.addAlert(a.price, a.condition, a.message, a.repeating, followChannel(a.channel, ids), a.label, options);
    } catch (err) {
      leftOut(err);
    }
  }
}

/** What keeping a drawing's alerts needs of them. */
export type StashedAlerts = Pick<AlertManager, 'takeDrawingAlerts' | 'restoreAlerts' | 'pruneDrawingAlerts'>;

/**
 * A drawing's alerts go with it, and come back with it when an undo brings
 * the drawing back.
 */
export class DrawingAlertStash {
  private readonly kept = new Map<string, PriceAlert[]>();

  constructor(private readonly alerts: StashedAlerts) {}

  /** The drawing went: its alerts are kept aside. */
  removed(drawingId: string): void {
    const taken = this.alerts.takeDrawingAlerts(drawingId);
    if (taken.length > 0) this.kept.set(drawingId, taken);
  }

  /** The drawing is (back) on the chart: the alerts kept for it come back. */
  created(drawingId: string): void {
    const back = this.kept.get(drawingId);
    if (!back) return;
    this.kept.delete(drawingId);
    this.alerts.restoreAlerts(back);
  }

  /** The drawings were replaced: alerts on drawings not in `drawingIds` go, kept ones too. How many went. */
  prune(drawingIds: ReadonlySet<string>): number {
    this.kept.clear();
    return this.alerts.pruneDrawingAlerts(drawingIds);
  }
}
