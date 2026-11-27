import { currentScope } from './scope.js';

/**
 * The last values a sum was given, a missing one (NaN) included, so that
 * "the value `n` calls back" is where the whole series would have it.
 *
 * On the live bar it records each slot it writes over and puts it back on a
 * rollback: a tick that pushes and a later tick that does not (a condition
 * true, then false) still read what the bars before left.
 */
export class Ring {
  private readonly slots: Float64Array;
  private count = 0;
  private run = 0;
  private kept = { count: 0, run: 0 };
  /** The slots written over on the live bar, as [slot, value before], oldest first. */
  private overwritten: number[] = [];

  constructor(readonly size: number) {
    const scope = currentScope();
    this.slots = new Float64Array(size + 1).fill(Number.NaN);
    scope.units.push({
      commit: () => {
        this.kept = { count: this.count, run: this.run };
        this.overwritten = [];
      },
      rollback: () => {
        for (let i = this.overwritten.length - 2; i >= 0; i -= 2) this.slots[this.overwritten[i]] = this.overwritten[i + 1];
        this.overwritten = [];
        this.count = this.kept.count;
        this.run = this.kept.run;
      },
    });
    this.live = () => scope.live;
  }

  private readonly live: () => boolean;

  /** Take the next value. */
  push(value: number): void {
    const slot = this.count % this.slots.length;
    if (this.live()) this.overwritten.push(slot, this.slots[slot]);
    this.slots[slot] = value;
    this.count++;
    this.run = Number.isNaN(value) ? 0 : this.run + 1;
  }

  /** The value `back` values before the last one given (0: the last); NaN before the first. */
  at(back: number): number {
    const index = this.count - 1 - back;
    if (back < 0 || back > this.size || index < 0) return Number.NaN;
    return this.slots[index % this.slots.length];
  }

  /** How many values were given. */
  get given(): number {
    return this.count;
  }

  /** How many values in a row, up to the last, were numbers. */
  get numbersInRow(): number {
    return this.run;
  }
}
