import { floatColumn } from './Column.js';
import { currentScope, type Scope } from './scope.js';

/** A value kept from bar to bar: what a bar leaves in it, the next bar finds. */
export interface Var<T> {
  value: T;
}

/** A value kept from bar to bar, put back to the bar before's when the live bar runs again. */
export function keep<T extends number | string | boolean>(init: T): Var<T> {
  const scope = currentScope('state.var');
  const cell = { value: init };
  let kept = init;
  scope.units.push({
    commit: () => {
      kept = cell.value;
    },
    rollback: () => {
      cell.value = kept;
    },
  });
  return cell;
}

/** A value a bar the script sets and reads back (`at(1)`: the bar before's). */
export interface ScriptSeries {
  /** Set this bar's value; returns it. */
  set(value: number): number;
  /** The value `back` bars ago (0: this bar's); NaN where none was set. */
  at(back?: number): number;
}

export function seriesOf(): ScriptSeries {
  const scope = currentScope('state.series');
  const column = floatColumn();
  scope.clearers.push((bar) => column.set(bar, Number.NaN));
  return {
    set: (value) => {
      column.set(scope.bar, value);
      return value;
    },
    // Never a bar ahead: a bar reads only itself and the bars before it.
    at: (back = 0) => (back >= 0 ? column.get(scope.bar - Math.floor(back)) : Number.NaN),
  };
}

/**
 * A list kept from bar to bar. On the live bar it records how to undo each
 * change, so a tick that runs the bar again starts from the list as the bar
 * before left it; on the closed bars it records nothing.
 */
export class ScriptArray {
  private items: number[] = [];
  private undo: (() => void)[] = [];

  constructor(private readonly scope: Scope) {
    scope.units.push({
      commit: () => {
        this.undo = [];
      },
      rollback: () => {
        for (let i = this.undo.length - 1; i >= 0; i--) this.undo[i]();
        this.undo = [];
      },
    });
  }

  private record(step: () => void): void {
    if (this.scope.live) this.undo.push(step);
  }

  size(): number {
    return this.items.length;
  }

  /** The value at `index` (negative: from the end); NaN outside the list. */
  get(index: number): number {
    const at = index < 0 ? this.items.length + index : index;
    return at >= 0 && at < this.items.length ? this.items[at] : Number.NaN;
  }

  set(index: number, value: number): void {
    if (index < 0 || index >= this.items.length) throw new RangeError(`array.set: index ${index} is outside a list of ${this.items.length}`);
    const before = this.items[index];
    this.items[index] = value;
    this.record(() => {
      this.items[index] = before;
    });
  }

  push(value: number): void {
    this.items.push(value);
    this.record(() => {
      this.items.pop();
    });
  }

  pop(): number {
    if (this.items.length === 0) return Number.NaN;
    const value = this.items.pop()!;
    this.record(() => {
      this.items.push(value);
    });
    return value;
  }

  shift(): number {
    if (this.items.length === 0) return Number.NaN;
    const value = this.items.shift()!;
    this.record(() => {
      this.items.unshift(value);
    });
    return value;
  }

  unshift(value: number): void {
    this.items.unshift(value);
    this.record(() => {
      this.items.shift();
    });
  }

  clear(): void {
    const before = this.items;
    this.items = [];
    this.record(() => {
      this.items = before;
    });
  }

  /** A copy of the values. */
  toArray(): number[] {
    return [...this.items];
  }

  sum(): number {
    let total = 0;
    for (const v of this.items) total += v;
    return total;
  }

  avg(): number {
    return this.items.length > 0 ? this.sum() / this.items.length : Number.NaN;
  }

  min(): number {
    return this.items.reduce((best, v) => (v < best ? v : best), this.items.length > 0 ? Infinity : Number.NaN);
  }

  max(): number {
    return this.items.reduce((best, v) => (v > best ? v : best), this.items.length > 0 ? -Infinity : Number.NaN);
  }

  /** The middle value, or the mean of the two middle ones. */
  median(): number {
    const n = this.items.length;
    if (n === 0) return Number.NaN;
    const sorted = [...this.items].sort((a, b) => a - b);
    const mid = n >> 1;
    return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

export function arrayOf(): ScriptArray {
  return new ScriptArray(currentScope('state.array'));
}
