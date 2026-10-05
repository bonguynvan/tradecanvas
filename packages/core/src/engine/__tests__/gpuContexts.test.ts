import { describe, it, expect, vi, afterEach } from 'vitest';
import { claimGpuContext, gpuContextsLeft, setMaxWebGLCharts, whenGpuContextFree, DEFAULT_MAX_WEBGL_CHARTS } from '../gpuContexts.js';

afterEach(() => setMaxWebGLCharts(DEFAULT_MAX_WEBGL_CHARTS));

describe('WebGL contexts the charts hold', () => {
  it('hands out up to the limit, and takes each back once', () => {
    setMaxWebGLCharts(2);
    const a = claimGpuContext();
    const b = claimGpuContext();
    expect(a && b).toBeTruthy();
    expect(claimGpuContext()).toBeNull();
    expect(gpuContextsLeft()).toBe(0);
    a!();
    a!();
    expect(gpuContextsLeft()).toBe(1);
    b!();
    expect(gpuContextsLeft()).toBe(2);
  });

  it('tells those waiting when one is let go or the limit rises, until they stop waiting', () => {
    setMaxWebGLCharts(1);
    const release = claimGpuContext()!;
    const first = vi.fn();
    const second = vi.fn();
    whenGpuContextFree(first);
    const stop = whenGpuContextFree(second);
    stop();
    release();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    // Once only.
    claimGpuContext()!();
    expect(first).toHaveBeenCalledTimes(1);
    const third = vi.fn();
    setMaxWebGLCharts(0);
    whenGpuContextFree(third);
    setMaxWebGLCharts(3);
    expect(third).toHaveBeenCalledTimes(1);
  });

  it('takes a whole, non-negative limit', () => {
    setMaxWebGLCharts(2.7);
    expect(gpuContextsLeft()).toBe(2);
    setMaxWebGLCharts(-1);
    expect(gpuContextsLeft()).toBe(0);
    setMaxWebGLCharts(Number.NaN);
    expect(gpuContextsLeft()).toBe(DEFAULT_MAX_WEBGL_CHARTS);
    setMaxWebGLCharts(Number.POSITIVE_INFINITY);
    expect(gpuContextsLeft()).toBe(Number.POSITIVE_INFINITY);
    const claimed = claimGpuContext();
    expect(claimed).not.toBeNull();
    claimed!();
  });

  it('wakes every waiting one though one of them throws, and still reports the error', async () => {
    setMaxWebGLCharts(0);
    const after = vi.fn();
    whenGpuContextFree(() => { throw new Error('a host callback'); });
    whenGpuContextFree(after);
    const reported = new Promise<unknown>((resolve) => {
      const onError = (e: unknown) => { resolve(e); return true; };
      process.once('uncaughtException', onError);
    });
    setMaxWebGLCharts(1);
    expect(after).toHaveBeenCalledTimes(1);
    expect(String(await reported)).toContain('a host callback');
  });
});
