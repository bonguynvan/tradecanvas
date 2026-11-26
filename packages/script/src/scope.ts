/**
 * What a script keeps from bar to bar, and how its live bar is run again.
 *
 * A run goes over the closed bars once, then runs its last bar (the one still
 * trading) again on each tick. Every piece of state a script makes in setup
 * (a `ta` sum, a kept value, a list) registers here, so the run can keep it
 * as it was when the live bar began (`commit`) and put it back before the
 * bar runs again (`rollback`). The closed bars are never run again, so their
 * state is not kept bar by bar: the run commits once, before the live bar.
 */

/** A piece of a script's state the run keeps and puts back. */
export interface Unit {
  /** Keep the state as it is now: the live bar will start again from here. */
  commit(): void;
  /** Put back the state kept last. */
  rollback(): void;
}

export interface Scope {
  readonly units: Unit[];
  /**
   * Whether the bar being run is the live one, run again on each tick. Only
   * then a list records how to undo what it does.
   */
  live: boolean;
  /** The bar being run, by its index. */
  bar: number;
  /** What empties a value a bar the script writes, before a bar is run (again). */
  readonly clearers: ((bar: number) => void)[];
}

let active: Scope | null = null;

/** Run `fn` with `scope` taking the state made meanwhile. */
export function inScope<T>(scope: Scope, fn: () => T): T {
  const outer = active;
  active = scope;
  try {
    return fn();
  } finally {
    active = outer;
  }
}

/** The scope a script's setup is running in. */
export function currentScope(what = 'ta and state'): Scope {
  if (!active) throw new Error(`${what} are made in a script's setup, not on a bar: each keeps the state of one script`);
  return active;
}

/** A set of numbers the run keeps and puts back as one. */
export function cell<T extends Record<string, number>>(init: T): T {
  const live = { ...init };
  const kept = { ...init };
  currentScope().units.push({
    commit: () => Object.assign(kept, live),
    rollback: () => Object.assign(live, kept),
  });
  return live;
}
