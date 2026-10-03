import type { ViewportState, Theme, Point } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { Emitter } from '../realtime/Emitter.js';

/**
 * When an alert fires: the value crosses the level (or the other line, with
 * `target`), stays above or below it, or moves `percent` up or down within
 * `bars` bars (`movesUp` / `movesDown`).
 */
export type AlertCondition = 'crossingUp' | 'crossingDown' | 'crossing' | 'greaterThan' | 'lessThan' | 'movesUp' | 'movesDown';

/** What an alert can add to a level: another line, a move, bar closes, an end. */
export interface AlertOptions {
  /**
   * Compare with this channel instead of the level: the price crossing a
   * moving average (`'<instanceId>:value'`), one indicator line crossing
   * another. Not with `movesUp` / `movesDown`.
   */
  target?: string;
  /** `movesUp` / `movesDown`: the move in percent… */
  percent?: number;
  /**
   * …within this many bars (2–500), counting the forming one; the move is
   * measured on each bar's latest value (its close, for a closed bar).
   */
  bars?: number;
  /** Look only at bars that closed: no firing on a wick that comes back. */
  onBarClose?: boolean;
  /** When it stops (ms since the epoch): past it, it is `expired` and fires no more. */
  expiresAt?: number;
}

/** The most bars a move may be measured over. */
export const MAX_ALERT_BARS = 500;
/** The fewest: a move is between two bars at least. */
export const MIN_ALERT_BARS = 2;

const MOVES: readonly AlertCondition[] = ['movesUp', 'movesDown'];

export interface PriceAlert {
  id: string;
  price: number;
  condition: AlertCondition;
  message?: string;
  triggered: boolean;
  repeating: boolean;
  /** Data channel evaluated against `price`. `'price'` (default) or an
   *  indicator line id like `<instanceId>:<key>`. */
  channel: string;
  /** Human label for the source (e.g. "RSI"). Defaults to the price. */
  label?: string;
  /**
   * The drawing whose line(s) the price is checked against (a trend line, a
   * channel). `price` then follows the drawing's first line at the latest bar.
   */
  drawingId?: string;
  /** See {@link AlertOptions}. */
  target?: string;
  percent?: number;
  bars?: number;
  onBarClose?: boolean;
  expiresAt?: number;
  /** It reached `expiresAt` without being taken down: it fires no more. */
  expired?: boolean;
}

/** A plain level on the price: the only alerts with a line of their own on the chart. */
export function isPriceLevelAlert(alert: PriceAlert): boolean {
  return alert.channel === 'price' && !alert.drawingId && !alert.target && !MOVES.includes(alert.condition);
}

/** Whether the level conditions hold going from `prev` to `now` (crossings need `prev`). */
function levelMet(prev: number | undefined, now: number, level: number, condition: AlertCondition): boolean {
  switch (condition) {
    case 'crossingUp':
      return prev !== undefined && prev < level && now >= level;
    case 'crossingDown':
      return prev !== undefined && prev > level && now <= level;
    case 'crossing':
      return prev !== undefined && ((prev < level && now >= level) || (prev > level && now <= level));
    case 'greaterThan':
      return now > level;
    case 'lessThan':
      return now < level;
    default:
      return false;
  }
}

/** Conditions an alert on a drawing can have: its lines move, so only crossings. */
const DRAWING_CONDITIONS: readonly AlertCondition[] = ['crossing', 'crossingUp', 'crossingDown'];

function crossed(before: number, now: number, condition: AlertCondition): boolean {
  const up = before < 0 && now >= 0;
  const down = before > 0 && now <= 0;
  return condition === 'crossingUp' ? up : condition === 'crossingDown' ? down : up || down;
}

interface AlertEvents {
  triggered: PriceAlert;
  added: PriceAlert;
  removed: string;
  updated: PriceAlert;
  /** It reached its `expiresAt` without firing. */
  expired: PriceAlert;
  [key: string]: unknown;
}

/** A channel's value on each bar (the latest seen while it formed), oldest first. */
interface BarValue {
  time: number;
  value: number;
}

let alertId = 1;

/** The longest a timer can wait (setTimeout's limit). */
const MAX_TIMER_MS = 2 ** 31 - 1;

/**
 * Manages price alerts. Renders alert lines on the chart overlay.
 * Checks each price update against configured alerts and emits 'triggered'.
 */
export class AlertManager extends Emitter<AlertEvents> {
  private alerts: PriceAlert[] = [];
  private lastValues = new Map<string, number>();
  /** Per drawing alert, which side of each of its lines the price was on (-1, 0, 1). */
  private drawingSides = new Map<string, number[]>();
  private drawingLevels: ((drawingId: string) => number[] | null) | null = null;
  private requestRender: (() => void) | null = null;
  private pricePrecision = 2;
  /** The forming bar's time, for moves over bars and bar closes. */
  private barTime: number | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private history = new Map<string, BarValue[]>();
  /** Per alert on another line, this line minus that one when last seen (a crossing needs two). */
  private lastDiffs = new Map<string, number>();

  /** The time of the bar forming now: values come per bar from here on. */
  setBarTime(time: number | null): void {
    this.barTime = time;
  }

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setPricePrecision(precision: number): void {
    this.pricePrecision = precision;
  }

  addAlert(
    price: number,
    condition: AlertCondition = 'crossing',
    message?: string,
    repeating = false,
    channel = 'price',
    label?: string,
    options: AlertOptions = {},
  ): string {
    const extra = checkedOptions(condition, channel, options);
    const id = `tc_alert_${alertId++}`;
    const alert: PriceAlert = { id, price, condition, message, triggered: false, repeating, channel, label, ...extra };
    this.alerts.push(alert);
    if (extra.expiresAt !== undefined) this.scheduleExpiry();
    this.emit('added', alert);
    this.requestRender?.();
    return id;
  }

  /**
   * Where a drawing's lines are now: its prices at the latest bar, or null
   * when it is gone or doesn't reach that time. Drawing alerts need it.
   */
  setDrawingLevels(resolver: ((drawingId: string) => number[] | null) | null): void {
    this.drawingLevels = resolver;
  }

  /** Alert when the price crosses a drawing's line(s). Throws a RangeError for a non-crossing condition. */
  addDrawingAlert(
    drawingId: string,
    condition: AlertCondition = 'crossing',
    message?: string,
    repeating = false,
    label?: string,
  ): string {
    if (!DRAWING_CONDITIONS.includes(condition)) {
      throw new RangeError(`An alert on a drawing takes a crossing condition, not "${condition}"`);
    }
    const id = `tc_alert_${alertId++}`;
    const price = this.drawingLevels?.(drawingId)?.[0] ?? Number.NaN;
    const alert: PriceAlert = { id, price, condition, message, triggered: false, repeating, channel: 'price', label, drawingId };
    this.alerts.push(alert);
    this.emit('added', alert);
    return id;
  }

  /** Remove every alert on a drawing (it was deleted). */
  removeDrawingAlerts(drawingId: string): void {
    for (const alert of this.alerts.filter((a) => a.drawingId === drawingId)) this.removeAlert(alert.id);
  }

  /**
   * Remove a drawing's alerts and hand them over, to put back with
   * `restoreAlerts` if the drawing comes back (an undo).
   */
  takeDrawingAlerts(drawingId: string): PriceAlert[] {
    const taken = this.alerts.filter((a) => a.drawingId === drawingId);
    for (const alert of taken) this.removeAlert(alert.id);
    return taken.map((a) => ({ ...a }));
  }

  /** Put alerts back (from `takeDrawingAlerts`); ones already here are skipped. */
  restoreAlerts(alerts: readonly PriceAlert[]): void {
    for (const alert of alerts) {
      if (this.alerts.some((a) => a.id === alert.id)) continue;
      const restored = { ...alert };
      this.alerts.push(restored);
      this.emit('added', restored);
    }
    this.scheduleExpiry();
    this.requestRender?.();
  }

  /** Remove alerts on drawings that aren't in `drawingIds`. Returns how many went. */
  pruneDrawingAlerts(drawingIds: ReadonlySet<string>): number {
    const orphans = this.alerts.filter((a) => a.drawingId !== undefined && !drawingIds.has(a.drawingId));
    for (const alert of orphans) this.removeAlert(alert.id);
    return orphans.length;
  }

  removeAlert(id: string): void {
    this.drawingSides.delete(id);
    this.lastDiffs.delete(id);
    const timed = this.alerts.some((a) => a.id === id && a.expiresAt !== undefined);
    this.alerts = this.alerts.filter((a) => a.id !== id);
    if (timed) this.scheduleExpiry();
    this.emit('removed', id);
    this.requestRender?.();
  }

  getAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  /** First alert whose line is within `tolerance` px of `point.y`, or null. */
  getAlertAtPoint(point: Point, viewport: ViewportState, tolerance = 6): PriceAlert | null {
    const { chartRect } = viewport;
    if (point.y < chartRect.y || point.y > chartRect.y + chartRect.height) return null;
    let best: PriceAlert | null = null;
    let bestDist = tolerance;
    for (const alert of this.alerts) {
      if (!isPriceLevelAlert(alert)) continue; // only price levels have a chart line
      const dist = Math.abs(priceToY(alert.price, viewport) - point.y);
      if (dist <= bestDist) {
        bestDist = dist;
        best = alert;
      }
    }
    return best;
  }

  /** Move an alert to a new price (used by drag). Re-arms a triggered alert. */
  updateAlertPrice(id: string, price: number): void {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert || !Number.isFinite(price)) return;
    alert.price = price;
    alert.triggered = false;
    if (alert.expiresAt !== undefined) this.scheduleExpiry(); // armed again: it can expire again
    this.emit('updated', { ...alert });
    this.requestRender?.();
  }

  clearAlerts(): void {
    this.alerts = [];
    this.lastDiffs.clear();
    this.drawingSides.clear();
    this.scheduleExpiry();
    this.requestRender?.();
  }

  /** Call on each price update to check price-channel alerts and alerts on drawings. */
  checkPrice(price: number): void {
    this.checkChannel('price', price);
    this.checkDrawingAlerts(price);
  }

  /** Alerts on drawings, against the price (`checkChannels` covers the others). */
  checkDrawings(price: number): void {
    this.checkDrawingAlerts(price);
  }

  /** Alerts past their `expiresAt` stop, and say so (a one-shot that already fired is done, not expired). */
  private expire(): void {
    const now = Date.now();
    const due = this.alerts.filter((a) => !a.expired && a.expiresAt !== undefined && now >= a.expiresAt && !(a.triggered && !a.repeating));
    if (due.length === 0) return;
    for (const alert of due) alert.expired = true;
    try {
      for (const alert of due) {
        this.emit('expired', { ...alert });
        this.emit('updated', { ...alert });
      }
    } finally {
      // A listener that throws doesn't stop the others' timer.
      this.requestRender?.();
      this.scheduleExpiry();
    }
  }

  /** Wake up at the next expiry, so an alert expires without ticks too. */
  private scheduleExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    const next = Math.min(...this.alerts
      .filter((a) => !a.expired && a.expiresAt !== undefined && !(a.triggered && !a.repeating))
      .map((a) => a.expiresAt as number));
    if (!Number.isFinite(next)) return;
    // setTimeout holds at most ~24.8 days; a later expiry wakes up and waits again.
    const wait = Math.min(Math.max(0, next - Date.now()), MAX_TIMER_MS);
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      this.expire();
      if (!this.expiryTimer) this.scheduleExpiry();
    }, wait);
  }

  /** Stop the expiry timer (the chart is going). */
  dispose(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }

  private checkDrawingAlerts(price: number): void {
    if (!this.drawingLevels || !Number.isFinite(price)) return;
    for (const alert of this.alerts) {
      if (!alert.drawingId || alert.expired) continue;
      const levels = this.drawingLevels(alert.drawingId);
      if (!levels || levels.length === 0) {
        // Not on the chart at this time: a crossing needs two sides seen in a row.
        this.drawingSides.delete(alert.id);
        continue;
      }
      alert.price = levels[0];
      const sides = levels.map((level) => Math.sign(price - level));
      const before = this.drawingSides.get(alert.id);
      this.drawingSides.set(alert.id, sides);
      if (!before || before.length !== sides.length) continue;
      if (sides.some((side, i) => crossed(before[i], side, alert.condition))) {
        if (!alert.triggered) {
          alert.triggered = true;
          this.emit('triggered', { ...alert });
        }
      } else if (alert.repeating) {
        alert.triggered = false;
      }
    }
  }

  /**
   * Evaluate every alert on `channel` (or comparing with it) against `value`,
   * e.g. the latest indicator-line value. The previous value per channel is
   * kept for crossings, and one value per bar (`setBarTime`) for moves over
   * bars and for alerts that look only at closed bars. To compare lines at
   * the same moment, give them together with `checkChannels`.
   */
  checkChannel(channel: string, value: number): void {
    this.checkChannels(new Map([[channel, value]]));
  }

  /**
   * Take the latest value of several channels at once (the price and the
   * indicator lines alerts watch), then evaluate the alerts on them: a line
   * against another line compares values of the same moment. With
   * `together`, an alert comparing two lines waits for a call that gives
   * both (otherwise it takes the other's latest value).
   */
  checkChannels(
    values: ReadonlyMap<string, number> | Readonly<Record<string, number>>,
    options: { together?: boolean } = {},
  ): void {
    const entries = values instanceof Map ? [...values.entries()] : Object.entries(values);
    const fresh = entries.filter(([, v]) => Number.isFinite(v));
    if (fresh.length === 0) return;
    this.expire();
    const prevs = new Map<string, number | undefined>();
    const closed = new Map<string, { channel: string; time: number }>();
    for (const [channel, value] of fresh) {
      prevs.set(channel, this.lastValues.get(channel));
      const bar = this.recordBar(channel, value);
      if (bar) closed.set(channel, bar);
      this.lastValues.set(channel, value);
    }

    for (const alert of this.alerts) {
      if (alert.drawingId || alert.expired) continue;
      const own = prevs.has(alert.channel);
      const other = alert.target !== undefined && prevs.has(alert.target);
      if (!own && !other) continue;
      if (alert.target !== undefined && options.together && !(own && other)) continue;
      let met: boolean;
      if (alert.onBarClose) {
        // Only when a bar closed, and by its values.
        const bar = closed.get(alert.channel) ?? (alert.target ? closed.get(alert.target) : undefined);
        if (!bar) continue;
        met = this.closedBarMet(alert, bar);
      } else if (alert.target) {
        met = this.targetMet(alert);
      } else if (MOVES.includes(alert.condition)) {
        if (!own) continue;
        met = this.moveMet(alert, this.history.get(alert.channel) ?? []);
      } else {
        const prev = prevs.get(alert.channel);
        if (!own || prev === undefined) continue; // the first value only seeds
        met = levelMet(prev, this.lastValues.get(alert.channel) as number, alert.price, alert.condition);
      }
      this.settle(alert, met);
    }
  }

  /** Fire once on entering the condition; a repeating alert re-arms once it leaves. */
  private settle(alert: PriceAlert, met: boolean): void {
    if (met) {
      if (!alert.triggered) {
        alert.triggered = true;
        this.emit('triggered', { ...alert });
      }
    } else if (alert.repeating) {
      alert.triggered = false;
    }
  }

  /** The line against the other one, tick by tick: their difference crossing zero. */
  private targetMet(alert: PriceAlert): boolean {
    const a = this.lastValues.get(alert.channel);
    const b = alert.target ? this.lastValues.get(alert.target) : undefined;
    if (a === undefined || b === undefined) return false;
    const diff = a - b;
    const before = this.lastDiffs.get(alert.id);
    this.lastDiffs.set(alert.id, diff);
    // Kept as the target's level, for lists.
    alert.price = b;
    return levelMet(before, diff, 0, alert.condition);
  }

  /** `percent` up from the lowest (or down from the highest) value of the last `bars` bars. */
  private moveMet(alert: PriceAlert, bars: readonly BarValue[], end = bars.length): boolean {
    const count = alert.bars ?? 1;
    const window = bars.slice(Math.max(0, end - count), end);
    if (window.length < 2 || alert.percent === undefined) return false;
    const now = window[window.length - 1].value;
    const values = window.map((b) => b.value);
    if (alert.condition === 'movesUp') {
      const low = Math.min(...values);
      return low !== 0 && ((now - low) / Math.abs(low)) * 100 >= alert.percent;
    }
    const high = Math.max(...values);
    return high !== 0 && ((high - now) / Math.abs(high)) * 100 >= alert.percent;
  }

  /** On the bar that just closed (`closed` in the history of the alert's channel). */
  private closedBarMet(alert: PriceAlert, closed: { channel: string; time: number }): boolean {
    const bars = this.history.get(alert.channel) ?? [];
    const at = bars.findIndex((b) => b.time === closed.time);
    if (at < 0) return false;
    if (MOVES.includes(alert.condition)) return this.moveMet(alert, bars, at + 1);
    const valueAt = (channel: string, index: number) => {
      const own = this.history.get(channel) ?? [];
      const time = bars[index]?.time;
      return time === undefined ? undefined : own.find((b) => b.time === time)?.value;
    };
    let now = bars[at].value;
    let before = at > 0 ? bars[at - 1].value : undefined;
    let level = alert.price;
    if (alert.target) {
      const b = valueAt(alert.target, at);
      const bBefore = at > 0 ? valueAt(alert.target, at - 1) : undefined;
      if (b === undefined) return false;
      now -= b;
      before = before !== undefined && bBefore !== undefined ? before - bBefore : undefined;
      level = 0;
      alert.price = b;
    }
    return levelMet(before, now, level, alert.condition);
  }

  /**
   * Keep `value` as the forming bar's on `channel`. Returns the bar that just
   * closed when this value starts a new one.
   */
  private recordBar(channel: string, value: number): { channel: string; time: number } | null {
    const time = this.barTime;
    if (time === null) return null;
    let bars = this.history.get(channel) ?? [];
    let last = bars[bars.length - 1];
    if (last && time < last.time) {
      // Back in time: what came after is not history any more, and no bar closed.
      bars = bars.filter((b) => b.time < time);
      bars.push({ time, value });
      this.history.set(channel, bars);
      return null;
    }
    if (last && last.time === time) {
      bars[bars.length - 1] = { time, value };
      return null;
    }
    last = bars[bars.length - 1];
    bars.push({ time, value });
    const keep = Math.min(MAX_ALERT_BARS + 2, Math.max(3, ...this.alerts.map((a) => (a.bars ?? 1) + 2)));
    if (bars.length > keep) bars.splice(0, bars.length - keep);
    this.history.set(channel, bars);
    return last ? { channel, time: last.time } : null;
  }

  /**
   * Forget per-channel previous values. Call on a data context change (symbol /
   * timeframe switch) so the first value of the new context seeds cleanly
   * instead of crossing against a stale previous value.
   */
  clearLastValues(): void {
    this.lastValues.clear();
    this.drawingSides.clear();
    this.history.clear();
    this.lastDiffs.clear();
  }

  saveToStorage(key: string): void {
    try {
      const data = this.alerts.map(a => ({
        id: a.id, price: a.price, condition: a.condition,
        message: a.message, triggered: a.triggered, repeating: a.repeating,
        channel: a.channel, label: a.label, drawingId: a.drawingId,
        target: a.target, percent: a.percent, bars: a.bars, onBarClose: a.onBarClose,
        expiresAt: a.expiresAt, expired: a.expired,
      }));
      localStorage.setItem(key, JSON.stringify(data));
    } catch { /* storage unavailable or full */ }
  }

  loadFromStorage(key: string): void {
    try {
      const json = localStorage.getItem(key);
      if (!json) return;
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return;
      for (const a of data) {
        if (typeof a.drawingId === 'string' && a.condition && !a.triggered) {
          if (DRAWING_CONDITIONS.includes(a.condition)) this.addDrawingAlert(a.drawingId, a.condition, a.message, a.repeating ?? false, a.label);
          continue;
        }
        if (!a.condition || a.triggered || a.expired) continue;
        const options = readAlertOptions(a);
        // A line or a move needs no level of its own.
        const needsLevel = !options.target && !MOVES.includes(a.condition);
        const price = typeof a.price === 'number' && Number.isFinite(a.price) ? a.price : Number.NaN;
        if (needsLevel && Number.isNaN(price)) continue;
        try {
          this.addAlert(price, a.condition, a.message, a.repeating ?? false, a.channel ?? 'price', a.label, options);
        } catch { /* not an alert this version can keep */ }
      }
    } catch { /* storage unavailable or corrupt data */ }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const { chartRect } = viewport;

    for (const alert of this.alerts) {
      // Indicator, drawing, line-against-line and move alerts have no line of their own.
      if (!isPriceLevelAlert(alert)) continue;
      const y = priceToY(alert.price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;

      // Armed: blue. Triggered: amber. Expired: grey.
      const color = alert.expired ? '#8a93a3' : alert.triggered ? '#f2a93b' : '#4c8dff';

      // Alert line
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bell icon + price label
      ctx.font = `10px ${theme.font.family}`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'right';
      const label = `🔔 ${viewport.formatPrice?.(alert.price) ?? alert.price.toFixed(this.pricePrecision)}${alert.message ? ` - ${alert.message}` : ''}`;
      ctx.fillText(label, chartRect.x + chartRect.width - 4, y - 2);
    }
  }
}

/** The options an alert may have, checked: a RangeError says what is wrong. */
function checkedOptions(condition: AlertCondition, channel: string, options: AlertOptions): AlertOptions {
  const out: AlertOptions = {};
  const move = MOVES.includes(condition);
  if (options.target !== undefined) {
    if (move) throw new RangeError('An alert on a move takes no other line');
    if (options.target === channel) throw new RangeError('An alert can’t compare a line with itself');
    out.target = options.target;
  }
  if (move) {
    const { percent, bars } = options;
    if (percent === undefined || !Number.isFinite(percent) || percent <= 0) throw new RangeError('An alert on a move needs a percent above 0');
    if (bars === undefined || !Number.isInteger(bars) || bars < MIN_ALERT_BARS || bars > MAX_ALERT_BARS) {
      throw new RangeError(`An alert on a move needs ${MIN_ALERT_BARS} to ${MAX_ALERT_BARS} bars`);
    }
    out.percent = percent;
    out.bars = bars;
  }
  if (options.onBarClose) out.onBarClose = true;
  if (options.expiresAt !== undefined && Number.isFinite(options.expiresAt)) out.expiresAt = options.expiresAt;
  return out;
}

/** The options of a stored alert (anything else is left out). */
export function readAlertOptions(raw: Record<string, unknown>): AlertOptions {
  const out: AlertOptions = {};
  if (typeof raw.target === 'string' && raw.target) out.target = raw.target;
  if (typeof raw.percent === 'number' && Number.isFinite(raw.percent)) out.percent = raw.percent;
  if (typeof raw.bars === 'number' && Number.isInteger(raw.bars)) out.bars = raw.bars;
  if (raw.onBarClose === true) out.onBarClose = true;
  if (typeof raw.expiresAt === 'number' && Number.isFinite(raw.expiresAt)) out.expiresAt = raw.expiresAt;
  return out;
}
