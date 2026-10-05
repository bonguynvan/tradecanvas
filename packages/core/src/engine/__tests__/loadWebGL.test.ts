import { describe, it, expect, vi, afterEach } from 'vitest';
import { DEFAULT_MAX_WEBGL_CHARTS, gpuContextsLeft, setMaxWebGLCharts } from '../gpuContexts.js';

const create = vi.hoisted(() => vi.fn());
vi.mock('../../webgl/WebGLSeriesRenderer.js', () => ({ WebGLSeriesRenderer: { create } }));

const { loadWebGL } = await import('../loadWebGL.js');

afterEach(() => {
  setMaxWebGLCharts(DEFAULT_MAX_WEBGL_CHARTS);
  create.mockReset();
});

describe('loading the WebGL renderer', () => {
  it('claims a context before loading, so of two asking for the last one only one gets it', async () => {
    setMaxWebGLCharts(1);
    let release: (() => void) | undefined;
    create.mockImplementation((options: { release: () => void }) => {
      release = options.release;
      return { destroy: () => options.release() };
    });
    const first = loadWebGL('webgl');
    const second = loadWebGL('auto');
    await expect(second).resolves.toEqual({ gpu: null, reason: 'limit' });
    const got = await first;
    expect(got.gpu).not.toBeNull();
    expect(gpuContextsLeft()).toBe(0);
    release!();
    expect(gpuContextsLeft()).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ failIfMajorPerformanceCaveat: false }));
  });

  it('gives the context back when there is no WebGL 2 to be had', async () => {
    setMaxWebGLCharts(1);
    create.mockReturnValue(null);
    await expect(loadWebGL('auto')).resolves.toEqual({ gpu: null, reason: 'unsupported' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ failIfMajorPerformanceCaveat: true }));
    expect(gpuContextsLeft()).toBe(1);
  });
});
