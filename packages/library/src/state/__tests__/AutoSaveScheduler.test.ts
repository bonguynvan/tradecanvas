import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoSaveScheduler } from '../AutoSaveScheduler.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AutoSaveScheduler', () => {
  it('starts disabled with no pending fire', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    expect(sched.isEnabled()).toBe(false);
    expect(sched.hasPending()).toBe(false);
  });

  it('schedule() is a no-op while disabled', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    sched.schedule();
    vi.advanceTimersByTime(10_000);
    expect(save).not.toHaveBeenCalled();
    expect(sched.hasPending()).toBe(false);
  });

  it('fires save(key) once after delayMs of quiet time', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    sched.enable('mychart', 100);
    sched.schedule();

    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('mychart');
    expect(sched.hasPending()).toBe(false);
  });

  it('debounces a burst of schedule() calls into a single save', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    sched.enable('chart', 100);

    sched.schedule();
    vi.advanceTimersByTime(50);
    sched.schedule();
    vi.advanceTimersByTime(50);
    sched.schedule();
    vi.advanceTimersByTime(50);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('disable() cancels a pending fire and reports disabled', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    sched.enable('chart', 100);
    sched.schedule();
    expect(sched.hasPending()).toBe(true);

    sched.disable();
    expect(sched.isEnabled()).toBe(false);
    expect(sched.hasPending()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(save).not.toHaveBeenCalled();
  });

  it('cancel() clears the timer but keeps enabled state', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    sched.enable('chart', 100);
    sched.schedule();
    sched.cancel();
    expect(sched.isEnabled()).toBe(true);
    expect(sched.hasPending()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(save).not.toHaveBeenCalled();
  });

  it('uses the latest key when re-enabled before firing', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    sched.enable('first', 100);
    sched.schedule();
    sched.enable('second', 100);
    sched.schedule();
    vi.advanceTimersByTime(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('second');
  });

  it('treats delayMs ≤ 0 as disabled even when a key is set', () => {
    const save = vi.fn();
    const sched = new AutoSaveScheduler(save);
    sched.enable('chart', 0);
    sched.schedule();
    vi.advanceTimersByTime(10_000);
    expect(save).not.toHaveBeenCalled();
    expect(sched.isEnabled()).toBe(false);
  });
});
