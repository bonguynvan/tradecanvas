import { Ring } from '../Ring.js';
import { cell } from '../scope.js';
import { num, whole, type Step } from './common.js';

/** Whether `a` went from one side of `b` to the other since the bar before; `up`: from at or under it to over it. */
function crossing(up: boolean): (a: number, b: number) => boolean {
  const state = cell({ a: Number.NaN, b: Number.NaN });
  return (aValue, bValue) => {
    const a = num(aValue);
    const b = num(bValue);
    const beforeA = state.a;
    const beforeB = state.b;
    state.a = a;
    state.b = b;
    if ([a, b, beforeA, beforeB].some(Number.isNaN)) return false;
    return up ? beforeA <= beforeB && a > b : beforeA >= beforeB && a < b;
  };
}

/** True on the bar where `a` goes over `b`: at or under it the bar before, over it now. */
export function crossover(): (a: number, b: number) => boolean {
  return crossing(true);
}

/** True on the bar where `a` goes under `b`: at or over it the bar before, under it now. */
export function crossunder(): (a: number, b: number) => boolean {
  return crossing(false);
}

/** True on the bar where `a` goes over or under `b`. */
export function cross(): (a: number, b: number) => boolean {
  const over = crossover();
  const under = crossunder();
  return (a, b) => {
    const up = over(a, b);
    const down = under(a, b);
    return up || down;
  };
}

/** A pivot `right` values back: strictly beyond the `left` values before it and the `right` after it, by `beyond`. */
function pivot(left: number, right: number, beyond: (a: number, b: number) => boolean): Step {
  const l = whole(left);
  const r = whole(right);
  const ring = new Ring(l + r);
  return (value) => {
    ring.push(num(value));
    if (ring.given < l + r + 1) return Number.NaN;
    const center = ring.at(r);
    if (Number.isNaN(center)) return Number.NaN;
    for (let k = 0; k <= l + r; k++) {
      if (k === r) continue;
      const v = ring.at(k);
      if (Number.isNaN(v) || !beyond(center, v)) return Number.NaN;
    }
    return center;
  };
}

/** The high of a pivot `right` bars back: higher than the `left` before it and the `right` after it. NaN on other bars. */
export function pivothigh(left: number, right: number): Step {
  return pivot(left, right, (center, other) => center > other);
}

/** The low of a pivot `right` bars back: lower than the `left` before it and the `right` after it. NaN on other bars. */
export function pivotlow(left: number, right: number): Step {
  return pivot(left, right, (center, other) => center < other);
}

/** How many bars since the condition was last true (0 on a bar it is); NaN before it ever was. */
export function barssince(): (condition: boolean) => number {
  const state = cell({ since: Number.NaN });
  return (condition) => {
    state.since = condition ? 0 : state.since + 1;
    return state.since;
  };
}

/** The value on the bar of the condition's `occurrence`-th last true (0: the last); NaN until there is one. */
export function valuewhen(occurrence = 0): (condition: boolean, value: number) => number {
  const back = Math.max(0, Math.floor(occurrence));
  const seen = new Ring(back);
  return (condition, value) => {
    if (condition) seen.push(num(value));
    return seen.at(back);
  };
}
