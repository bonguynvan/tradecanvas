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
