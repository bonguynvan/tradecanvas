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

/** An indicator engine drawing `overlays` in the plot and `panes` (id → draw) in panes. */
function fakeIndicators(overlays: ((c: CanvasRenderingContext2D) => void)[], panes: Record<string, (c: CanvasRenderingContext2D) => void> = {}) {
  return {
    overlayDraws: () => overlays,
    getLatestOverlayValues: () => [],
    getLatestValues: () => [],
    getPanelIndicators: () => Object.keys(panes).map((instanceId) => ({ instanceId, descriptor: { name: instanceId.toUpperCase() } })),
    isVisible: () => true,
    getLevels: () => [30, 70],
    getOutput: () => null,
    renderPanel: (c: CanvasRenderingContext2D, id: string) => panes[id]?.(c),
  } as unknown as RenderContext['indicatorEngine'];
}

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

  it('draws session break lines under the series, and their labels over the indicators', () => {
    const { ctx, scene } = makeContext();
    const order: string[] = [];
    scene.mockImplementation(() => order.push('series'));
    ctx.compareRenderer = { render: () => order.push('compare') } as unknown as RenderContext['compareRenderer'];
    ctx.indicatorEngine = fakeIndicators([() => order.push('overlay')]);
    ctx.sessionBreaks = {
      renderLines: () => order.push('lines'),
      renderLabels: () => order.push('labels'),
      isVisible: () => true,
    } as unknown as RenderContext['sessionBreaks'];
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(order).toEqual(['lines', 'series', 'compare', 'overlay', 'labels']);
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
  /**
   * A recorder whose steps run on a context of its own; step `i` (counted
   * over the frame) is kept when `keep(i)`.
   */
  function fakeRecorder(keep: (i: number) => boolean = () => true) {
    const canvas = document.createElement('canvas');
    const recording = fakeContext(canvas);
    let i = 0;
    const regions: { clip: { x: number; y: number; width: number; height: number }; options?: { text?: boolean }; drawText: ReturnType<typeof vi.fn> }[] = [];
    const recorder = {
      region: (clip: { x: number; y: number; width: number; height: number }, options?: { text?: boolean }) => {
        const drawText = vi.fn();
        regions.push({ clip, options, drawText });
        return {
          step: (draw: (c: CanvasRenderingContext2D) => void) => {
            if (!keep(i++)) return false;
            draw(recording);
            return true;
          },
          drawText,
        };
      },
    };
    return { recorder, recording, regions };
  }

  function fakeGpu(drawn: Record<string, boolean> = { series: true, volume: true, background: true, recorded: true, under: true }, rec = fakeRecorder()) {
    const canvas = document.createElement('canvas');
    let lostCallback: (() => void) | null = null;
    const gpu = {
      canvas,
      label: 'test GPU',
      render: vi.fn(() => drawn as { series: boolean; volume: boolean; background: boolean; recorded?: boolean }),
      recorder: vi.fn(() => rec.recorder),
      onLost: (cb: () => void) => { lostCallback = cb; },
      destroy: vi.fn(() => canvas.remove()),
    };
    return { gpu, lose: () => lostCallback?.(), rec };
  }

  /** The plot drawn by steps that say on which context they ran. */
  function stepContext() {
    const { ctx } = makeContext();
    const calls: [string, CanvasRenderingContext2D][] = [];
    const step = (name: string) => (c: CanvasRenderingContext2D) => { calls.push([name, c]); };
    ctx.chartRenderer = { render: (c: CanvasRenderingContext2D) => step('series')(c) } as unknown as RenderContext['chartRenderer'];
    ctx.compareRenderer = { render: (c: CanvasRenderingContext2D) => step('compare')(c) } as unknown as RenderContext['compareRenderer'];
    ctx.indicatorEngine = fakeIndicators([step('ema'), step('bands')], { rsi: step('rsi') });
    return { ctx, calls };
  }

  const sceneCtx = () => engine.layerManager.getLayer(LayerType.Main)!.ctx;

  it('records a series of another kind, compare and overlays for the GPU, in order', () => {
    const { ctx, calls } = stepContext();
    const { gpu, rec } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(calls.map(([name, c]) => [name, c === rec.recording])).toEqual([['series', true], ['compare', true], ['ema', true], ['bands', true]]);
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ candles: false, recorded: rec.recorder }));
    // Their text goes on the scene, in the plot.
    expect(rec.regions[0].clip).toEqual(ctx.viewport.chartRect);
    expect(rec.regions[0].drawText.mock.calls[0][0]).toBe(sceneCtx());
  });

  it('draws with Canvas 2D from the first step the GPU cannot take, keeping the order', () => {
    const { ctx, calls } = stepContext();
    const { gpu, rec } = fakeGpu(undefined, fakeRecorder((i) => i !== 1));
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    const plot = calls.filter(([name]) => name !== 'rsi');
    expect(plot.map(([name, c]) => [name, c === rec.recording ? 'gpu' : c === sceneCtx() ? 'scene' : '?'])).toEqual([
      ['series', 'gpu'],
      ['compare', 'scene'],
      ['ema', 'scene'],
      ['bands', 'scene'],
    ]);
  });

  it('draws every step with Canvas 2D when the GPU did not draw what was recorded', () => {
    const { ctx, calls } = stepContext();
    ctx.panels = [{ instanceId: 'rsi', rect: { x: 0, y: 200, width: 300, height: 100 }, viewport: ctx.viewport }];
    const { gpu, rec } = fakeGpu({ series: false, volume: false, background: true, recorded: false });
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    const onScene = calls.filter(([, c]) => c === sceneCtx()).map(([name]) => name);
    expect(onScene).toEqual(['series', 'compare', 'ema', 'bands', 'rsi']);
    expect(rec.regions.every((r) => r.drawText.mock.calls.length === 0)).toBe(true);
  });

  it('draws every step with Canvas 2D for a GPU renderer that records nothing', () => {
    const { ctx, calls } = stepContext();
    const { gpu } = fakeGpu();
    const bare = { ...gpu, recorder: undefined };
    engine.attachGpu(bare);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(calls.filter(([, c]) => c === sceneCtx()).map(([name]) => name)).toEqual(['series', 'compare', 'ema', 'bands']);
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ recorded: null }));
  });

  it('records a pane: its background, levels and indicator; the header stays on the scene', () => {
    const { ctx, calls } = stepContext();
    ctx.panels = [{ instanceId: 'rsi', rect: { x: 0, y: 200, width: 300, height: 100 }, viewport: { ...ctx.viewport, chartRect: { x: 0, y: 220, width: 300, height: 80 } } }];
    const { gpu, rec } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    const fillRect = vi.fn();
    const fillText = vi.fn();
    sceneCtx().fillRect = fillRect;
    sceneCtx().fillText = fillText;
    runFrame();
    expect(calls.find(([name]) => name === 'rsi')?.[1]).toBe(rec.recording);
    // The pane's background and its inner part are regions of their own.
    expect(rec.regions.map((r) => r.clip)).toEqual([
      ctx.viewport.chartRect,
      { x: 0, y: 200, width: 300, height: 100 },
      { x: 0, y: 220, width: 300, height: 80 },
    ]);
    // On the scene: the divider and the title, not the background.
    expect(fillRect.mock.calls).toContainEqual([0, 200, 300, 3]);
    expect(fillRect.mock.calls).not.toContainEqual([0, 200, 300, 100]);
    expect(fillText).toHaveBeenCalledWith('RSI', 6, 206);
    expect(rec.regions[2].drawText.mock.calls[0][0]).toBe(sceneCtx());
  });

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

  /** Each canvas by role, bottom to top: by z-index, then document order. */
  const stack = (gpu?: { canvas: HTMLCanvasElement }) => {
    const scene = engine.layerManager.getLayer(LayerType.Main)!.canvas;
    const top = engine.layerManager.getLayer(LayerType.Hover)!.canvas;
    const nameOf = (c: HTMLCanvasElement) => (c === scene ? 'scene' : c === top ? 'top' : c === gpu?.canvas ? 'gpu' : 'back');
    return [...container.querySelectorAll('canvas')]
      .map((c, i) => ({ c, z: Number(c.style.zIndex), i }))
      .sort((a, b) => a.z - b.z || a.i - b.i)
      .map(({ c }) => nameOf(c));
  };
  /** Whether `c` is the 2D canvas under the GPU's. */
  const isBack = (c: CanvasRenderingContext2D, gpu: { canvas: HTMLCanvasElement }) =>
    c.canvas !== gpu.canvas && c.canvas !== engine.layerManager.getLayer(LayerType.Main)!.canvas && c.canvas !== engine.layerManager.getLayer(LayerType.Hover)!.canvas;

  it('stacks the GPU canvas under the scene and the top, leaving their z-index as it was', () => {
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
    // Page elements stacked over the chart stay over it.
    expect(engine.layerManager.getLayer(LayerType.Main)!.canvas.style.zIndex).toBe('0');
    expect(engine.layerManager.getLayer(LayerType.Hover)!.canvas.style.zIndex).toBe('1');
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
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
  });

  it('gives session shading and break lines to the GPU, and draws break labels over the bars', async () => {
    const { ctx } = await candleContext();
    const shade = { x: 0, y: 0, width: 50, height: 200, color: 'rgba(0,0,0,0.28)', alpha: 1 };
    const dash = { x: 99.5, y: 0, width: 1, height: 6, color: '#333', alpha: 0.22 };
    const lines = vi.fn();
    const labels = vi.fn();
    ctx.sessionShading = { render: vi.fn(), rects: () => [shade], isVisible: () => true } as unknown as RenderContext['sessionShading'];
    ctx.sessionBreaks = { renderLines: lines, renderLabels: labels, lineRects: () => [dash], isVisible: () => true } as unknown as RenderContext['sessionBreaks'];
    const { gpu } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ background: { grid: true, rects: [shade, dash] } }));
    expect(lines).not.toHaveBeenCalled();
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
    expect((labels.mock.calls[0][0] as CanvasRenderingContext2D).canvas).toBe(engine.layerManager.getLayer(LayerType.Main)!.canvas);
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
    expect(stack(gpu)).toEqual(['back', 'gpu', 'scene', 'top']);
    // The grid goes under the watermark, on the canvas under the GPU's.
    expect(grid).toHaveBeenCalledTimes(1);
    expect(isBack(grid.mock.calls[0][0] as CanvasRenderingContext2D, gpu)).toBe(true);
    expect(isBack(watermark.mock.calls[0][0] as CanvasRenderingContext2D, gpu)).toBe(true);
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
    expect(stack(gpu)).toEqual(['back', 'gpu', 'scene', 'top']);
    watermark = false;
    engine.requestRender();
    runFrame();
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
  });

  it('draws the grid with Canvas 2D when the GPU does not', async () => {
    const { ctx, grid } = await candleContext();
    const { gpu } = fakeGpu({ series: true, volume: true, background: false });
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(grid).toHaveBeenCalledTimes(1);
    expect(isBack(grid.mock.calls[0][0] as CanvasRenderingContext2D, gpu)).toBe(true);
  });

  it('records a depth heatmap under the bars, with no background canvas', async () => {
    const { ctx } = await candleContext();
    const heat = vi.fn();
    ctx.depthHeatmap = { render: heat, isVisible: () => true } as unknown as RenderContext['depthHeatmap'];
    const { gpu, rec } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(heat.mock.calls[0][0]).toBe(rec.recording);
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ under: rec.recorder, background: { grid: true, rects: [] } }));
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
    // Clipped to the plot, as on the background canvas, and with no text:
    // nothing could put it between the GPU's background and its bars.
    expect(rec.regions[0].clip).toEqual(ctx.viewport.chartRect);
    expect(rec.regions[0].options).toEqual({ text: false });
  });

  it('puts a market profile that writes text on the background canvas, with all under the bars, unrecorded', async () => {
    const { ctx, volume } = await candleContext();
    const profile = vi.fn();
    const drawsText = vi.fn(() => true);
    ctx.marketProfile = { render: profile, isVisible: () => true, drawsText } as unknown as RenderContext['marketProfile'];
    const { gpu, rec } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(rec.regions.some((r) => r.options?.text === false)).toBe(false);
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ under: null, background: null, volume: null }));
    expect(stack(gpu)).toEqual(['back', 'gpu', 'scene', 'top']);
    const last = <T extends { mock: { calls: unknown[][] } }>(f: T) => f.mock.calls.at(-1)![0] as CanvasRenderingContext2D;
    expect(isBack(last(volume), gpu)).toBe(true);
    expect(isBack(last(profile), gpu)).toBe(true);
    // Without text it goes to the GPU.
    drawsText.mockReturnValue(false);
    engine.requestRender(LayerType.Main);
    runFrame();
    expect(rec.regions.some((r) => r.options?.text === false)).toBe(true);
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
  });

  it('puts only what goes under the bars on the background canvas when the GPU drew the background but not them', async () => {
    const { ctx, grid } = await candleContext();
    const heat = vi.fn();
    ctx.depthHeatmap = { render: heat, isVisible: () => true } as unknown as RenderContext['depthHeatmap'];
    const { gpu } = fakeGpu({ series: true, volume: true, background: true, recorded: true, under: false });
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(stack(gpu)).toEqual(['back', 'gpu', 'scene', 'top']);
    expect(isBack(heat.mock.calls.at(-1)![0] as CanvasRenderingContext2D, gpu)).toBe(true);
    // The grid once, by the GPU.
    expect(grid.mock.calls.some(([c]) => isBack(c as CanvasRenderingContext2D, gpu))).toBe(false);
  });

  it('records volume under a volume profile, in the order Canvas 2D draws them', async () => {
    const { ctx, volume } = await candleContext();
    const order: string[] = [];
    volume.mockImplementation(() => order.push('volume'));
    ctx.volumeProfile = { render: () => order.push('profile'), isVisible: () => true } as unknown as RenderContext['volumeProfile'];
    const { gpu, rec } = fakeGpu();
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    // The GPU's own volume would go over the profile: none, it's recorded.
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ volume: null }));
    expect(order).toEqual(['volume', 'profile']);
    expect(volume.mock.calls[0][0]).toBe(rec.recording);
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
  });

  it('draws what goes under the bars on the background canvas when the GPU cannot take all of it', async () => {
    const { ctx, volume } = await candleContext();
    const heat = vi.fn();
    const profile = vi.fn();
    ctx.depthHeatmap = { render: heat, isVisible: () => true } as unknown as RenderContext['depthHeatmap'];
    ctx.volumeProfile = { render: profile, isVisible: () => true } as unknown as RenderContext['volumeProfile'];
    // The second of the steps under the bars (volume) can't be recorded.
    const { gpu } = fakeGpu(undefined, fakeRecorder((i) => i !== 1));
    engine.attachGpu(gpu);
    engine.setRenderContext(ctx);
    engine.start();
    runFrame();
    expect(gpu.render).toHaveBeenCalledWith(expect.objectContaining({ under: null, background: null }));
    expect(stack(gpu)).toEqual(['back', 'gpu', 'scene', 'top']);
    const last = <T extends { mock: { calls: unknown[][] } }>(f: T) => f.mock.calls.at(-1)![0] as CanvasRenderingContext2D;
    expect(isBack(last(heat), gpu)).toBe(true);
    expect(isBack(last(volume), gpu)).toBe(true);
    expect(isBack(last(profile), gpu)).toBe(true);
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
    expect(stack(gpu)).toEqual(['gpu', 'scene', 'top']);
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
    expect(stack(gpu)).toEqual(['scene', 'top']);
  });
});
