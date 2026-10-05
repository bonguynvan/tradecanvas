import type { GpuRenderer } from './gpu.js';
import { claimGpuContext } from './gpuContexts.js';

/** What `loadWebGL` got: a renderer, or why not. */
export type WebGLLoad =
  | { gpu: GpuRenderer; reason?: undefined }
  | { gpu: null; reason: 'unsupported' | 'limit' };

/**
 * The WebGL renderer, loaded on first use so it stays out of the main bundle.
 * It holds one of the WebGL contexts the charts on the page may have
 * (`setMaxWebGLCharts`), claimed before anything is loaded so two charts can't
 * both take the last one. None when the charts hold all of them ('limit'), nor
 * where WebGL 2 can't be had, or with 'auto' only runs in software, slower
 * than Canvas 2D ('unsupported'). A failure to load (offline, a blocked
 * script) is logged as a warning, not thrown: the chart draws on with Canvas 2D.
 */
export async function loadWebGL(mode: 'webgl' | 'auto'): Promise<WebGLLoad> {
  const release = claimGpuContext();
  if (!release) return { gpu: null, reason: 'limit' };
  let module: typeof import('../webgl/WebGLSeriesRenderer.js');
  try {
    module = await import('../webgl/WebGLSeriesRenderer.js');
  } catch (err) {
    release();
    console.warn('TradeCanvas: the WebGL renderer failed to load, drawing with Canvas 2D.', err);
    return { gpu: null, reason: 'unsupported' };
  }
  const gpu = module.WebGLSeriesRenderer.create({ failIfMajorPerformanceCaveat: mode === 'auto', release });
  if (!gpu) {
    release();
    return { gpu: null, reason: 'unsupported' };
  }
  return { gpu };
}

/** The renderer `loadWebGL` gets, or null. */
export async function loadWebGLRenderer(mode: 'webgl' | 'auto'): Promise<GpuRenderer | null> {
  return (await loadWebGL(mode)).gpu;
}
