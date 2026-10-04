// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayerType } from '@tradecanvas/commons';
import type { Theme, ViewportState } from '@tradecanvas/commons';
import { RenderEngine } from '../RenderEngine.js';
import type { RenderContext } from '../RenderEngine.js';

/** jsdom has no 2D context: a recorder that accepts any call or assignment. */
function fakeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = { canvas };
  return new Proxy(store, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

let frames: FrameRequestCallback[];
let container: HTMLDivElement;
let engine: RenderEngine;

const runFrame = () => {
  const pending = frames;
  frames = [];
  for (const cb of pending) cb(0);
};

function makeContext(): {
  ctx: RenderContext;
  scene: ReturnType<typeof vi.fn>;
  top: ReturnType<typeof vi.fn>;
} {
  const scene = vi.fn();
  const top = vi.fn();
  const viewport = {
    chartRect: { x: 0, y: 0, width: 300, height: 200 },
    priceRange: { min: 0, max: 100 },
  } as unknown as ViewportState;
  const ctx: RenderContext = {
    chartRenderer: { render: scene } as unknown as RenderContext['chartRenderer'],
    gridRenderer: null,
    priceAxis: null,
    timeAxis: null,
    crosshairHandler: {
      render: top,
      renderAxisLabels: () => {},
      getPosition: () => null,
    } as unknown as RenderContext['crosshairHandler'],
    indicatorEngine: null,
    drawingRenderer: null,
    tradingRenderer: null,
    currentPriceLine: null,
    chartLegend: null,
    volumeRenderer: null,
    volumeProfile: null,
    marketProfile: null,
    depthHeatmap: null,
    periodLevels: null,
    pivotMarkers: null,
    watermark: null,
    barCountdown: null,
    sessionBreaks: null,
    sessionShading: null,
    compareRenderer: null,
    alertManager: null,
    signalMarkerManager: null,
    measureOverlay: null,
    tradeZoneManager: null,
    panels: [],
    viewport,
    theme: { font: { family: 'sans-serif', sizeSmall: 10 } } as unknown as Theme,
    data: [],
  };
  return { ctx, scene, top };
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this) as never;
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  engine = new RenderEngine(container);
});

afterEach(() => {
  engine.destroy();
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RenderEngine — two canvases', () => {
  it('paints into a scene canvas and a top canvas', () => {
    const canvases = [...container.querySelectorAll('canvas')];
    expect(canvases.map((c) => c.style.zIndex)).toEqual(['0', '1']);
    const scene = engine.layerManager.getLayer(LayerType.Main)!.canvas;
    const top = engine.layerManager.getLayer(LayerType.Hover)!.canvas;
    expect(top).not.toBe(scene);
    for (const type of [LayerType.Background, LayerType.Panel, LayerType.Overlay, LayerType.UI]) {
      expect(engine.layerManager.getLayer(type)!.canvas).toBe(scene);
    }
  });

  it('a hover repaints only the top canvas', () => {
    const { ctx, scene, top } = makeContext();
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(scene).toHaveBeenCalledTimes(1);
    expect(top).toHaveBeenCalledTimes(1);

    engine.requestRender(LayerType.Hover);
    runFrame();
    expect(scene).toHaveBeenCalledTimes(1);
    expect(top).toHaveBeenCalledTimes(2);
  });

  it('any other change repaints both canvases', () => {
    const { ctx, scene, top } = makeContext();
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();

    for (const type of [LayerType.Background, LayerType.Main, LayerType.Overlay, LayerType.UI]) {
      engine.requestRender(type);
      runFrame();
    }
    expect(scene).toHaveBeenCalledTimes(5);
    expect(top).toHaveBeenCalledTimes(5);
  });

  it('a hover leaves the scene canvas untouched', () => {
    const { ctx } = makeContext();
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    const sceneClear = vi.fn();
    engine.layerManager.getLayer(LayerType.Main)!.ctx.clearRect = sceneClear;
    engine.requestRender(LayerType.Hover);
    runFrame();
    expect(sceneClear).not.toHaveBeenCalled();
  });

  it('puts pointer-tied visuals and overlay/ui plugins on the top canvas', () => {
    const { ctx } = makeContext();
    const legend = vi.fn();
    const plugins: [CanvasRenderingContext2D, string][] = [];
    ctx.chartLegend = { render: legend } as unknown as RenderContext['chartLegend'];
    ctx.renderOverlayPlugins = (c, layer) => plugins.push([c, layer]);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    const sceneCtx = engine.layerManager.getLayer(LayerType.Main)!.ctx;
    const topCtx = engine.layerManager.getLayer(LayerType.Hover)!.ctx;
    const canvasOf = (c: CanvasRenderingContext2D) => (c === sceneCtx ? 'scene' : c === topCtx ? 'top' : '?');
    expect(canvasOf(legend.mock.calls[0][0])).toBe('top');
    expect(plugins.map(([c, layer]) => `${layer}:${canvasOf(c)}`)).toEqual(['main:scene', 'overlay:top', 'ui:top']);
  });

  it('skips painting while the plot has no size', () => {
    const { ctx, scene, top } = makeContext();
    ctx.viewport = { ...ctx.viewport, chartRect: { x: 0, y: 0, width: 0, height: 0 } };
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(scene).not.toHaveBeenCalled();
    expect(top).not.toHaveBeenCalled();
  });

  it('draws session break lines under the series and their labels over it', () => {
    const { ctx, scene } = makeContext();
    const order: string[] = [];
    scene.mockImplementation(() => order.push('series'));
    ctx.sessionBreaks = {
      render: () => order.push('lines'),
      renderLabels: () => order.push('labels'),
      isVisible: () => true,
    } as unknown as RenderContext['sessionBreaks'];
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(order).toEqual(['lines', 'series', 'labels']);
  });

  it('several requests in one frame paint each canvas once', () => {
    const { ctx, scene, top } = makeContext();
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();

    engine.requestRender(LayerType.Overlay);
    engine.requestRender(LayerType.UI);
    engine.requestRender(LayerType.Hover);
    runFrame();
    expect(scene).toHaveBeenCalledTimes(2);
    expect(top).toHaveBeenCalledTimes(2);
  });
});

describe('RenderEngine — a GPU layer under the scene', () => {
  function fakeGpu(drawn = { series: true, volume: true, background: true }) {
    const canvas = document.createElement('canvas');
    let lostCallback: (() => void) | null = null;
    const gpu = {
      canvas,
      label: 'test GPU',
      render: vi.fn(() => drawn),
      onLost: (cb: () => void) => { lostCallback = cb; },
      destroy: vi.fn(() => canvas.remove()),
    };
    return { gpu, lose: () => lostCallback?.() };
  }

  async function candleContext() {
    const { CandlestickRenderer } = await import('../../charts/CandlestickRenderer.js');
    const { ctx } = makeContext();
    const candles = new CandlestickRenderer();
    const series = vi.spyOn(candles, 'render').mockImplementation(() => {});
    const grid = vi.fn();
    const volume = vi.fn();
    ctx.chartRenderer = candles;
    ctx.gridRenderer = { render: grid, isVisible: () => true } as unknown as RenderContext['gridRenderer'];
    ctx.volumeRenderer = { render: volume, isVisible: () => true, getHeightRatio: () => 0.15 } as unknown as RenderContext['volumeRenderer'];
    return { ctx, series, grid, volume };
  }

  const zIndexes = () => [...container.querySelectorAll('canvas')].map((c) => c.style.zIndex).sort();

  it('stacks the GPU canvas under the scene and the top', () => {
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    const byZ = [...container.querySelectorAll('canvas')].sort((a, b) => Number(a.style.zIndex) - Number(b.style.zIndex));
    expect(byZ.map((c) => c.style.zIndex)).toEqual(['1', '2', '3']);
    expect(byZ[0]).toBe(gpu.canvas);
    expect(byZ[1]).toBe(engine.layerManager.getLayer(LayerType.Main)!.canvas);
  });

  it('leaves candles, volume and the grid to the GPU', async () => {
    const { ctx, series, grid, volume } = await candleContext();
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ candles: true, volume: { heightRatio: 0.15 }, background: { grid: true, rects: [] } }));
    expect(series).not.toHaveBeenCalled();
    expect(volume).not.toHaveBeenCalled();
    expect(grid).not.toHaveBeenCalled();
    // Nothing else under the bars: no canvas for it.
    expect(zIndexes()).toEqual(['1', '2', '3']);
  });

  it('gives session shading and break lines to the GPU, and draws break labels over the bars', async () => {
    const { ctx } = await candleContext();
    const shade = { x: 0, y: 0, width: 50, height: 200, color: 'rgba(0,0,0,0.28)', alpha: 1 };
    const dash = { x: 99.5, y: 0, width: 1, height: 6, color: '#333', alpha: 0.22 };
    const lines = vi.fn();
    const labels = vi.fn();
    ctx.sessionShading = { render: vi.fn(), rects: () => [shade], isVisible: () => true } as unknown as RenderContext['sessionShading'];
    ctx.sessionBreaks = { render: lines, renderLabels: labels, lineRects: () => [dash], isVisible: () => true } as unknown as RenderContext['sessionBreaks'];
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ background: { grid: true, rects: [shade, dash] } }));
    expect(lines).not.toHaveBeenCalled();
    expect(zIndexes()).toEqual(['1', '2', '3']);
    expect((labels.mock.calls[0][0] as CanvasRenderingContext2D).canvas.style.zIndex).toBe('2');
  });

  it('draws the background under the GPU canvas when there is more than the grid', async () => {
    const { ctx, grid } = await candleContext();
    const watermark = vi.fn();
    ctx.watermark = { render: watermark, isVisible: () => true } as unknown as RenderContext['watermark'];
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ background: null }));
    expect(zIndexes()).toEqual(['0', '1', '2', '3']);
    // The grid goes under the watermark, on the canvas under the GPU's.
    expect(grid).toHaveBeenCalledTimes(1);
    expect((grid.mock.calls[0][0] as CanvasRenderingContext2D).canvas.style.zIndex).toBe('0');
    expect((watermark.mock.calls[0][0] as CanvasRenderingContext2D).canvas.style.zIndex).toBe('0');
  });

  it('drops the background canvas once nothing needs it', async () => {
    const { ctx } = await candleContext();
    let watermark = true;
    ctx.watermark = { render: vi.fn(), isVisible: () => watermark } as unknown as RenderContext['watermark'];
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(zIndexes()).toEqual(['0', '1', '2', '3']);
    watermark = false;
    engine.requestRender();
    runFrame();
    expect(zIndexes()).toEqual(['1', '2', '3']);
  });

  it('draws the grid with Canvas 2D when the GPU does not', async () => {
    const { ctx, grid } = await candleContext();
    const { gpu } = fakeGpu({ series: true, volume: true, background: false });
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(grid).toHaveBeenCalledTimes(1);
    expect((grid.mock.calls[0][0] as CanvasRenderingContext2D).canvas.style.zIndex).toBe('0');
  });

  it('asks for no grid when it is hidden', async () => {
    const { ctx } = await candleContext();
    ctx.gridRenderer = { render: vi.fn(), isVisible: () => false } as unknown as RenderContext['gridRenderer'];
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ background: { grid: false, rects: [] } }));
    expect(zIndexes()).toEqual(['1', '2', '3']);
  });

  it('draws with Canvas 2D what the GPU leaves', async () => {
    const { ctx, series } = await candleContext();
    const { gpu } = fakeGpu({ series: false, volume: true, background: true });
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(series).toHaveBeenCalledTimes(1);
  });

  it('asks the GPU for no candles when the series is drawn some other way', () => {
    const { ctx } = makeContext();
    const { gpu } = fakeGpu({ series: false, volume: false, background: true });
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ candles: false, volume: null }));
  });

  it('goes back to Canvas 2D when the GPU context is lost', async () => {
    const { ctx, series } = await candleContext();
    const { gpu, lose } = fakeGpu();
    const lost = vi.fn();
    engine.onGpuLost = lost;
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    lose();
    expect(lost).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    runFrame();
    expect(series).toHaveBeenCalledTimes(1);
  });

  it('detaches, leaving the two canvases', async () => {
    const { ctx } = await candleContext();
    ctx.watermark = { render: vi.fn(), isVisible: () => true } as unknown as RenderContext['watermark'];
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    engine.detachGpu();
    expect(gpu.destroy).toHaveBeenCalled();
    expect(zIndexes()).toEqual(['0', '1']);
  });
});
