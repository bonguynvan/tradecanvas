import type { GpuRenderer } from './gpu.js';

/**
 * The WebGL renderer, loaded on first use so it stays out of the main bundle.
 * Null where WebGL 2 can't be had (with 'auto': nor where it only runs in
 * software, slower than Canvas 2D).
 */
export async function loadWebGLRenderer(mode: 'webgl' | 'auto'): Promise<GpuRenderer | null> {
  try {
    const { WebGLSeriesRenderer } = await import('../webgl/WebGLSeriesRenderer.js');
    return WebGLSeriesRenderer.create({ failIfMajorPerformanceCaveat: mode === 'auto' });
  } catch {
    return null;
  }
}
