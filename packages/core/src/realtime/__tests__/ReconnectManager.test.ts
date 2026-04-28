import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReconnectManager } from '../ReconnectManager.js';

beforeEach(() => {
  vi.useFakeTimers();
  // Stable jitter at 0 → delay equals the deterministic baseDelay * multiplier^(attempt-1).
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ReconnectManager.schedule', () => {
  it('is a no-op until start() flips it active', () => {
    const mgr = new ReconnectManager({ baseDelay: 100 });
    const connectFn = vi.fn();
    const onAttempt = vi.fn();
    mgr.on('attempt', onAttempt);

    mgr.schedule(connectFn);
    expect(onAttempt).not.toHaveBeenCalled();
    expect(mgr.getAttempt()).toBe(0);
  });

  it('is a no-op when reconnect is disabled', () => {
    const mgr = new ReconnectManager({ enabled: false, baseDelay: 100 });
    const onAttempt = vi.fn();
    mgr.on('attempt', onAttempt);
    mgr.start();
    mgr.schedule(vi.fn());
    expect(onAttempt).not.toHaveBeenCalled();
  });

  it('emits attempt and runs connectFn after the delay elapses', () => {
    const mgr = new ReconnectManager({ baseDelay: 100, backoffMultiplier: 2 });
    const connectFn = vi.fn();
    const onAttempt = vi.fn();
    mgr.on('attempt', onAttempt);
    mgr.start();

    mgr.schedule(connectFn);
    expect(onAttempt).toHaveBeenCalledTimes(1);
    expect(onAttempt).toHaveBeenCalledWith({ attempt: 1, delay: 100 });
    expect(connectFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(connectFn).toHaveBeenCalledTimes(1);
  });

  it('grows delay exponentially across consecutive attempts', () => {
    const mgr = new ReconnectManager({ baseDelay: 100, backoffMultiplier: 2 });
    const onAttempt = vi.fn();
    mgr.on('attempt', onAttempt);
    mgr.start();

    mgr.schedule(vi.fn());
    mgr.schedule(vi.fn());
    mgr.schedule(vi.fn());

    expect(onAttempt.mock.calls.map((c) => c[0])).toEqual([
      { attempt: 1, delay: 100 },
      { attempt: 2, delay: 200 },
      { attempt: 3, delay: 400 },
    ]);
  });

  it('caps delay at maxDelay', () => {
    const mgr = new ReconnectManager({
      baseDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 5000,
    });
    const onAttempt = vi.fn();
    mgr.on('attempt', onAttempt);
    mgr.start();

    for (let i = 0; i < 6; i++) mgr.schedule(vi.fn());

    const delays = onAttempt.mock.calls.map((c) => c[0].delay);
    // Sequence: 1000, 2000, 4000, 5000, 5000, 5000 — capped after attempt 4.
    expect(delays).toEqual([1000, 2000, 4000, 5000, 5000, 5000]);
  });

  it('emits giveUp once attempts exceed maxRetries and stops scheduling', () => {
    const mgr = new ReconnectManager({ maxRetries: 2, baseDelay: 100 });
    const onGiveUp = vi.fn();
    const onAttempt = vi.fn();
    mgr.on('giveUp', onGiveUp);
    mgr.on('attempt', onAttempt);
    mgr.start();

    mgr.schedule(vi.fn());
    mgr.schedule(vi.fn());
    mgr.schedule(vi.fn());
    mgr.schedule(vi.fn());

    expect(onAttempt).toHaveBeenCalledTimes(2);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    expect(onGiveUp).toHaveBeenCalledWith({ attempts: 2 });
    expect(mgr.isActive()).toBe(false);
  });

  it('jitter never produces a negative delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // pushes jitter to -25%
    const mgr = new ReconnectManager({ baseDelay: 100, backoffMultiplier: 2 });
    const onAttempt = vi.fn();
    mgr.on('attempt', onAttempt);
    mgr.start();
    mgr.schedule(vi.fn());
    expect(onAttempt.mock.calls[0][0].delay).toBeGreaterThanOrEqual(0);
  });
});

describe('ReconnectManager.onConnected', () => {
  it('resets the attempt counter and emits success', () => {
    const mgr = new ReconnectManager({ baseDelay: 100 });
    const onSuccess = vi.fn();
    mgr.on('success', onSuccess);
    mgr.start();
    mgr.schedule(vi.fn());
    mgr.schedule(vi.fn());
    expect(mgr.getAttempt()).toBe(2);

    mgr.onConnected();
    expect(mgr.getAttempt()).toBe(0);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending reconnection timer', () => {
    const mgr = new ReconnectManager({ baseDelay: 100 });
    const connectFn = vi.fn();
    mgr.start();
    mgr.schedule(connectFn);

    mgr.onConnected();
    vi.advanceTimersByTime(1000);
    expect(connectFn).not.toHaveBeenCalled();
  });
});

describe('ReconnectManager.stop / cancel', () => {
  it('stop() prevents queued connectFn from running and resets attempt', () => {
    const mgr = new ReconnectManager({ baseDelay: 100 });
    const connectFn = vi.fn();
    mgr.start();
    mgr.schedule(connectFn);
    expect(mgr.getAttempt()).toBe(1);

    mgr.stop();
    vi.advanceTimersByTime(1000);
    expect(connectFn).not.toHaveBeenCalled();
    expect(mgr.getAttempt()).toBe(0);
    expect(mgr.isActive()).toBe(false);
  });

  it('cancel() clears the timer without resetting attempt', () => {
    const mgr = new ReconnectManager({ baseDelay: 100 });
    const connectFn = vi.fn();
    mgr.start();
    mgr.schedule(connectFn);
    mgr.cancel();
    vi.advanceTimersByTime(1000);
    expect(connectFn).not.toHaveBeenCalled();
    expect(mgr.getAttempt()).toBe(1);
  });
});
