import type { GpuRenderer } from './gpu.js';

/**
 * The WebGL renderer, loaded on first use so it stays out of the main bundle.
 * Null where WebGL 2 can't be had (with 'auto': nor where it only runs in
 * software, slower than Canvas 2D). A failure to load (offline, a blocked
 * script) is logged as a warning, not thrown: the chart draws on with Canvas 2D.
 */
export async function loadWebGLRenderer(mode: 'webgl' | 'auto'): Promise<GpuRenderer | null> {
  let module: typeof import('../webgl/WebGLSeriesRenderer.js');
  try {
    module = await import('../webgl/WebGLSeriesRenderer.js');
  } catch (err) {
    console.warn('TradeCanvas: the WebGL renderer failed to load, drawing with Canvas 2D.', err);
    return null;
  }
  return module.WebGLSeriesRenderer.create({ failIfMajorPerformanceCaveat: mode === 'auto' });
}
