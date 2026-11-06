/**
 * A few lines of fine-grained reactivity for the widget: a piece of its state is a signal, and
 * whatever shows it is an effect that runs again when, and only when, what it read changed. One
 * effect per piece of UI replaces the calls a writer had to remember to make after each change.
 *
 * Effects run synchronously: a write returns with the UI already showing it, as the widget's
 * tests and its hosts expect. `batch` holds them until a group of writes is done.
 */

/** A value that can be read and followed. */
export interface Readable<T> {
  /** The value, followed by the effect or computed reading it. */
  get(): T;
  /** The value, not followed. */
  peek(): T;
}

/** A value that can be read, followed and written. */
export interface Signal<T> extends Readable<T> {
  set(value: T): void;
  update(change: (value: T) => T): void;
}

/** Disposes what made it. */
export type Dispose = () => void;

/** Runs effects made inside `run` and disposes them all at once. */
export interface Scope {
  run<T>(fn: () => T): T;
  dispose(): void;
}

/** How many rounds of effects one write may cause before it is taken as a loop. */
const MAX_FLUSH_ROUNDS = 100;

interface Source {
  /** Goes up each time the value really changes. */
  version: number;
  subs: Set<Observer>;
  /** Brings a computed up to date; a signal is always current. */
  refresh(): void;
}

interface Observer {
  sources: Map<Source, number>;
  /** A source it read may have changed. */
  mark(): void;
}

let current: Observer | null = null;
let currentScope: Dispose[] | null = null;
let batchDepth = 0;
/** The flush running now: writes made by its effects join it instead of starting another. */
let flushing = false;
const pending = new Set<EffectNode>();

function track(source: Source): void {
  if (!current) return;
  current.sources.set(source, source.version);
  source.subs.add(current);
}

function notify(source: Source): void {
  for (const sub of [...source.subs]) sub.mark();
}

function untrack(observer: Observer): void {
  for (const source of observer.sources.keys()) {
    source.subs.delete(observer);
    // A computed nothing reads any more lets go of its own sources, or a long-lived signal would keep it.
    if (source instanceof ComputedNode && source.subs.size === 0) source.release();
  }
  observer.sources.clear();
}

/** Whether a source read on the last run has changed since. */
function stale(observer: Observer): boolean {
  for (const [source, seen] of observer.sources) {
    source.refresh();
    if (source.version !== seen) return true;
  }
  return false;
}

function observe<T>(observer: Observer, fn: () => T): T {
  untrack(observer);
  const outer = current;
  current = observer;
  try {
    return fn();
  } finally {
    current = outer;
  }
}

class SignalNode<T> implements Source, Signal<T> {
  version = 0;
  subs = new Set<Observer>();
  constructor(private value: T) {}
  refresh(): void {}
  get(): T {
    track(this);
    return this.value;
  }
  peek(): T {
    return this.value;
  }
  set(value: T): void {
    if (Object.is(value, this.value)) return;
    this.value = value;
    this.version++;
    batch(() => notify(this));
  }
  update(change: (value: T) => T): void {
    this.set(change(this.value));
  }
}

class ComputedNode<T> implements Source, Observer, Readable<T> {
  version = 0;
  subs = new Set<Observer>();
  sources = new Map<Source, number>();
  private dirty = true;
  private value!: T;
  private computed = false;
  constructor(private readonly fn: () => T) {}
  mark(): void {
    if (this.dirty) return;
    this.dirty = true;
    notify(this);
  }
  refresh(): void {
    if (!this.dirty) return;
    // Clean only once worked out: one that threw is tried again on the next read.
    if (this.computed && !stale(this)) {
      this.dirty = false;
      return;
    }
    const next = observe(this, this.fn);
    this.dirty = false;
    if (this.computed && Object.is(next, this.value)) return;
    this.value = next;
    this.computed = true;
    this.version++;
  }
  get(): T {
    this.refresh();
    track(this);
    return this.value;
  }
  peek(): T {
    this.refresh();
    return this.value;
  }
  /** Follows nothing until it is read again, and is worked out afresh then. */
  release(): void {
    untrack(this);
    this.dirty = true;
    this.computed = false;
  }
}

class EffectNode implements Observer {
  sources = new Map<Source, number>();
  private cleanup: (() => void) | void = undefined;
  disposed = false;
  constructor(private readonly fn: () => void | (() => void)) {}
  mark(): void {
    if (!this.disposed) pending.add(this);
  }
  run(): void {
    const cleanup = this.cleanup;
    this.cleanup = undefined;
    cleanup?.();
    this.cleanup = observe(this, this.fn);
  }
  runIfStale(): void {
    if (!this.disposed && stale(this)) this.run();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    pending.delete(this);
    untrack(this);
    this.cleanup?.();
    this.cleanup = undefined;
  }
}

function flush(): void {
  if (flushing) return;
  flushing = true;
  let rounds = 0;
  // An effect that throws holds back none of the others; the first error is thrown once all ran.
  let failure: { error: unknown } | null = null;
  try {
    while (pending.size > 0) {
      if (++rounds > MAX_FLUSH_ROUNDS) {
        pending.clear();
        throw new Error('signals: an effect did not settle; it keeps changing what it reads');
      }
      const due = [...pending];
      pending.clear();
      for (const node of due) {
        try {
          node.runIfStale();
        } catch (error) {
          failure ??= { error };
        }
      }
    }
  } finally {
    flushing = false;
  }
  if (failure) throw failure.error;
}

/** A value whose writes run the effects that read it. */
export function signal<T>(value: T): Signal<T> {
  return new SignalNode(value);
}

/** A value worked out from others, again only when one of them changed and it is read. */
export function computed<T>(fn: () => T): Readable<T> {
  return new ComputedNode(fn);
}

/**
 * Runs `fn` now and again each time a signal it read changes. What `fn` returns is run before
 * the next run and on dispose. Made inside a scope, the scope disposes it.
 */
export function effect(fn: () => void | (() => void)): Dispose {
  const node = new EffectNode(fn);
  const dispose = (): void => node.dispose();
  currentScope?.push(dispose);
  batch(() => node.run());
  return dispose;
}

/** Runs the writes in `fn`, then each effect they touched once. */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    // The writes made before a throw are kept, so their effects run too.
    batchDepth--;
    if (batchDepth === 0) flush();
  }
}

/** A scope to make effects in, disposed together: one per widget. */
export function createScope(): Scope {
  const owned: Dispose[] = [];
  return {
    run<T>(fn: () => T): T {
      const outer = currentScope;
      currentScope = owned;
      try {
        return fn();
      } finally {
        currentScope = outer;
      }
    },
    dispose(): void {
      for (const dispose of owned.splice(0)) dispose();
    },
  };
}
