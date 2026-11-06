import { describe, it, expect } from 'vitest';
import { signal, computed, effect, batch, createScope } from '../signals';

describe('signals', () => {
  it('reads and writes a value', () => {
    const s = signal(1);
    s.set(2);
    expect(s.get()).toBe(2);
    s.update((v) => v + 1);
    expect(s.get()).toBe(3);
  });

  it('runs an effect at once and again on each change, in the same tick', () => {
    const s = signal('a');
    const seen: string[] = [];
    effect(() => { seen.push(s.get()); });
    s.set('b');
    expect(seen).toEqual(['a', 'b']);
  });

  it('skips a write of the same value', () => {
    const s = signal(1);
    let runs = 0;
    effect(() => { s.get(); runs++; });
    s.set(1);
    expect(runs).toBe(1);
  });

  it('stops after dispose and runs the cleanup', () => {
    const s = signal(1);
    const log: string[] = [];
    const stop = effect(() => {
      const v = s.get();
      log.push(`run ${v}`);
      return () => log.push(`clean ${v}`);
    });
    s.set(2);
    stop();
    s.set(3);
    expect(log).toEqual(['run 1', 'clean 1', 'run 2', 'clean 2']);
  });

  it('follows only what the last run read', () => {
    const on = signal(true);
    const a = signal(1);
    const b = signal(1);
    let runs = 0;
    effect(() => { runs++; if (on.get()) a.get(); else b.get(); });
    on.set(false);
    a.set(2);
    expect(runs).toBe(2);
    b.set(2);
    expect(runs).toBe(3);
  });

  it('derives a computed value lazily and caches it', () => {
    const s = signal(2);
    let calls = 0;
    const double = computed(() => { calls++; return s.get() * 2; });
    expect(calls).toBe(0);
    expect(double.get()).toBe(4);
    expect(double.get()).toBe(4);
    expect(calls).toBe(1);
    s.set(3);
    expect(double.get()).toBe(6);
  });

  it('runs an effect on a computed only when its value changes', () => {
    const s = signal(1);
    const even = computed(() => s.get() % 2 === 0);
    const seen: boolean[] = [];
    effect(() => { seen.push(even.get()); });
    s.set(3);
    s.set(4);
    expect(seen).toEqual([false, true]);
  });

  it('runs an effect once for a batch of writes', () => {
    const a = signal(1);
    const b = signal(1);
    const sums: number[] = [];
    effect(() => { sums.push(a.get() + b.get()); });
    batch(() => { a.set(2); b.set(3); });
    expect(sums).toEqual([2, 5]);
  });

  it('does not follow what an untracked read reads', () => {
    const a = signal(1);
    const b = signal(1);
    let runs = 0;
    effect(() => { runs++; a.get(); b.peek(); });
    b.set(2);
    expect(runs).toBe(1);
  });

  it('a scope disposes every effect made in it', () => {
    const s = signal(1);
    let runs = 0;
    const scope = createScope();
    scope.run(() => {
      effect(() => { s.get(); runs++; });
      effect(() => { s.get(); runs++; });
    });
    scope.dispose();
    s.set(2);
    expect(runs).toBe(2);
  });

  it('an effect that writes another signal settles before the write returns', () => {
    const a = signal(1);
    const b = signal(0);
    effect(() => { b.set(a.get() * 10); });
    const seen: number[] = [];
    effect(() => { seen.push(b.get()); });
    a.set(2);
    expect(seen).toEqual([10, 20]);
  });

  it('stops an effect that keeps changing what it reads', () => {
    const s = signal(0);
    expect(() => effect(() => { s.set(s.get() + 1); })).toThrow(/settle/);
  });

  it('runs the effects of the writes made before a batch threw', () => {
    const s = signal(1);
    const seen: number[] = [];
    effect(() => { seen.push(s.get()); });
    expect(() => batch(() => { s.set(2); throw new Error('boom'); })).toThrow('boom');
    expect(seen).toEqual([1, 2]);
  });

  it('runs the other effects of a write when one throws, then throws', () => {
    const s = signal(1);
    const seen: number[] = [];
    effect(() => { if (s.get() === 2) throw new Error('bad'); });
    effect(() => { seen.push(s.get()); });
    expect(() => s.set(2)).toThrow('bad');
    expect(seen).toEqual([1, 2]);
  });

  it('works a computed out again on the next read after it threw', () => {
    const s = signal(0);
    let fail = true;
    const c = computed(() => { if (fail) throw new Error('not yet'); return s.get() + 1; });
    expect(() => c.get()).toThrow('not yet');
    fail = false;
    expect(c.get()).toBe(1);
  });

  it('lets go of its sources once nothing reads a computed', () => {
    const s = signal(1);
    let calls = 0;
    const c = computed(() => { calls++; return s.get(); });
    const stop = effect(() => { c.get(); });
    stop();
    s.set(2);
    s.set(3);
    expect(calls).toBe(1);
    expect(c.get()).toBe(3);
  });
});
