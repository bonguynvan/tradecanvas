// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import type { GpuFrame } from '../../engine/gpu.js';
import { gridLines } from '../../axis/gridLines.js';
import { WebGLSeriesRenderer } from '../WebGLSeriesRenderer.js';
import { claimGpuContext, DEFAULT_MAX_WEBGL_CHARTS, gpuContextsLeft, setMaxWebGLCharts } from '../../engine/gpuContexts.js';

/** A WebGL 2 context stand-in: records every call, answers what the renderer asks. */
function fakeGL(options: { compiles?: boolean; renderer?: string } = {}) {
  const calls: { name: string; args: unknown[] }[] = [];
  let lost = false;
  const loseContext = vi.fn(() => { lost = true; });
  const constants = new Map<string, number>();
  const extensions: string[] = [];
  const gl = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'isContextLost') return () => lost;
      if (prop === 'getExtension') {
        return (name: string) => {
          extensions.push(name);
          if (name === 'WEBGL_lose_context') return { loseContext };
          return name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: -1 } : null;
        };
      }
      if (prop === 'getParameter') return (p: number) => (p === -1 ? 'Unmasked GPU' : options.renderer ?? 'Fake GPU');
      if (prop === 'getShaderParameter') return () => options.compiles ?? true;
      if (prop === 'getProgramParameter') return () => true;
      if (prop === 'getShaderInfoLog' || prop === 'getProgramInfoLog') return () => 'bad shader';
      if (prop === 'getAttribLocation') return () => 0;
      if (prop === 'getUniformLocation') return (_p: unknown, name: string) => ({ name });
      if (prop.startsWith('create')) return () => ({});
      // GL enums: a number of their own each.
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) {
        if (!constants.has(prop)) constants.set(prop, constants.size + 1);
        return constants.get(prop);
      }
      return (...args: unknown[]) => { calls.push({ name: prop, args }); };
    },
  });
  const enumOf = (name: string) => constants.get(name);
  return { gl, calls, loseContext, extensions, lose: () => { lost = true; }, restore: () => { lost = false; }, enumOf };
}

const bar = (i: number, close = 100 + (i % 7)): OHLCBar => ({ time: 1_700_000_000_000 + i * 60_000, open: close - 1, high: close + 2, low: close - 3, close, volume: 10 + i });
const series = (n: number) => Array.from({ length: n }, (_, i) => bar(i));

const viewport: ViewportState = {
  chartRect: { x: 0, y: 10, width: 90, height: 40 },
  priceRange: { min: 90, max: 130 },
  barWidth: 3,
  barSpacing: 1,
  offset: 0,
  visibleRange: { from: 0, to: 19 },
};

function frame(over: Partial<GpuFrame> = {}): GpuFrame {
  return {
    data: series(20),
    viewport,
    theme: DARK_THEME,
    dpr: 2,
    candles: true,
    volume: { heightRatio: 0.15 },
    background: { grid: true, rects: [{ x: 40, y: 10, width: 1, height: 40, color: '#808080', alpha: 0.5, dash: [6, 4] }] },
    ...over,
  };
}

let fake: ReturnType<typeof fakeGL>;

function makeRenderer(options?: { compiles?: boolean; renderer?: string }, release?: () => void) {
  fake = fakeGL(options);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, type: string) {
    return (type === 'webgl2' ? fake.gl : null) as never;
  } as never);
  const r = WebGLSeriesRenderer.create({ release });
  if (r) {
    made.push(r);
    r.canvas.width = 180;
    r.canvas.height = 120;
    document.body.appendChild(r.canvas);
  }
  return r;
}

const named = (name: string) => fake.calls.filter((c) => c.name === name);

const made: WebGLSeriesRenderer[] = [];
beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => {
  // Each renderer holds a context until destroyed.
  for (const r of made.splice(0)) r.destroy();
  setMaxWebGLCharts(DEFAULT_MAX_WEBGL_CHARTS);
  vi.restoreAllMocks();
});

describe('WebGLSeriesRenderer', () => {
  it('reports what it drew', () => {
    const r = makeRenderer()!;
    expect(r.label).toBe('Fake GPU');
    expect(r.render(frame())).toEqual({ series: true, volume: true, background: true, recorded: false, under: false });
    expect(r.render(frame({ candles: false, volume: null, background: null }))).toEqual({ series: false, volume: false, background: false, recorded: false, under: false });
  });

  it('names its GPU by RENDERER, asking the debug extension (deprecated in some browsers) only where that is generic', () => {
    expect(makeRenderer()!.label).toBe('Fake GPU');
    expect(fake.extensions).not.toContain('WEBGL_debug_renderer_info');
    expect(makeRenderer({ renderer: 'WebKit WebGL' })!.label).toBe('Unmasked GPU');
  });

  it('draws the grid, the other rectangles, the volume, then the candles: a call each', () => {
    const r = makeRenderer()!;
    r.render(frame());
    const lines = gridLines(viewport);
    const draws = named('drawArraysInstanced').map((c) => [c.args[2], c.args[3]]);
    // Vertices per instance, instances: 6 per rectangle or volume bar, 12 per candle (wick, body).
    expect(draws).toEqual([[6, lines.horizontal.length + lines.vertical.length], [6, 1], [6, 20], [12, 20]]);
  });

  it('clears with the scissor off, then clips the bars to the plot in device pixels counted from the bottom', () => {
    const r = makeRenderer()!;
    r.render(frame());
    const order = fake.calls.map((c) => c.name);
    const scissorOff = fake.calls.findIndex((c) => c.name === 'disable' && c.args[0] === fake.enumOf('SCISSOR_TEST'));
    expect(scissorOff).toBeGreaterThanOrEqual(0);
    expect(scissorOff).toBeLessThan(order.indexOf('clear'));
    // The plot: y 10..50 at 2x is rows 20..100 of 120, so 20 up from the bottom.
    expect(named('scissor')[0].args).toEqual([0, 20, 180, 80]);
  });

  it('uploads only the bar that ticked', () => {
    const r = makeRenderer()!;
    const data = series(20);
    r.render(frame({ data }));
    expect(named('bufferSubData')).toHaveLength(0);
    data[19] = { ...data[19], close: 105, high: 110 };
    r.render(frame({ data }));
    const sub = named('bufferSubData');
    expect(sub).toHaveLength(1);
    // Byte offset of bar 19 (six floats a bar).
    expect(sub[0].args[1]).toBe(19 * 6 * 4);
  });

  it('dashes a rectangle on its own attribute, after the colour', () => {
    const r = makeRenderer()!;
    r.render(frame({ background: { grid: false, rects: [{ x: 1, y: 2, width: 3, height: 4, color: '#ff0000', alpha: 0.5, dash: [6, 4] }] }, candles: false, volume: null }));
    const upload = named('bufferData').find((c) => c.args[2] === fake.enumOf('STREAM_DRAW'));
    // Left, top, right, bottom, red at half strength (premultiplied), dash 6 on 4 off.
    expect([...(upload!.args[1] as Float32Array)]).toEqual([1, 2, 4, 6, 0.5, 0, 0, 0.5, 6, 4]);
  });

  it('draws recorded 2D drawing over the bars, in the order it was recorded', () => {
    const r = makeRenderer()!;
    const rec = r.recorder(2, null);
    const plotRegion = rec.region(viewport.chartRect);
    plotRegion.step((c) => {
      c.strokeStyle = '#ff0000';
      c.beginPath();
      c.moveTo(10, 20);
      c.lineTo(20, 30);
      c.lineTo(30, 25);
      c.stroke();
      c.fillStyle = 'rgba(0, 0, 255, 0.1)';
      c.beginPath();
      c.moveTo(10, 20);
      c.lineTo(30, 20);
      c.lineTo(20, 40);
      c.fill();
      c.fillRect(40, 20, 3, 10);
    });
    fake.calls.length = 0;
    const drawn = r.render(frame({ recorded: rec, background: null }));
    expect(drawn.recorded).toBe(true);
    const order = fake.calls.filter((c) => c.name === 'drawArraysInstanced' || c.name === 'drawArrays').map((c) => [c.name, c.args[2], c.args[3]]);
    expect(order).toEqual([
      // Volume, candles.
      ['drawArraysInstanced', 6, 20],
      ['drawArraysInstanced', 12, 20],
      // The stroke: two segments.
      ['drawArraysInstanced', 6, 2],
      // The polygon: a span each side of its middle corner.
      ['drawArraysInstanced', 6, 2],
      // The rectangle.
      ['drawArraysInstanced', 6, 1],
    ]);
    // The scissor is left off.
    expect(named('disable').at(-1)?.args[0]).toBe(fake.enumOf('SCISSOR_TEST'));
  });

  it('draws what was recorded to go under the bars before them, the rectangles of steps in a row in one call', () => {
    const r = makeRenderer()!;
    const under = r.recorder(2, null);
    const region = under.region(viewport.chartRect, { text: false });
    region.step((c) => {
      c.fillStyle = '#00ff00';
      c.fillRect(10, 20, 4, 4);
      c.fillRect(20, 20, 4, 4);
    });
    region.step((c) => c.fillRect(30, 20, 4, 4));
    fake.calls.length = 0;
    const drawn = r.render(frame({ under, background: null }));
    expect(drawn.under).toBe(true);
    const order = fake.calls.filter((c) => c.name === 'drawArraysInstanced').map((c) => [c.args[2], c.args[3]]);
    // The three rectangles, then volume and candles.
    expect(order).toEqual([[6, 3], [6, 20], [12, 20]]);
  });

  it('ignores a recorder it did not make', () => {
    const r = makeRenderer()!;
    const drawn = r.render(frame({ recorded: { region: () => { throw new Error('no'); } } }));
    expect(drawn.recorded).toBe(false);
  });

  it('draws nothing once the context is lost', () => {
    const r = makeRenderer()!;
    fake.lose();
    fake.calls.length = 0;
    expect(r.render(frame())).toEqual({ series: false, volume: false, background: false, recorded: false, under: false });
    expect(named('drawArraysInstanced')).toHaveLength(0);
  });

  it('says once when the context is lost, and soon when it was lost before anyone asked', async () => {
    const r = makeRenderer()!;
    const lost = vi.fn();
    r.onLost(lost);
    const event = new Event('webglcontextlost', { cancelable: true });
    r.canvas.dispatchEvent(event);
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(lost).toHaveBeenCalledTimes(1);
    // Cancelled, so the browser may hand the context back.
    expect(event.defaultPrevented).toBe(true);

    const early = makeRenderer()!;
    fake.lose();
    const late = vi.fn();
    early.onLost(late);
    expect(late).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('builds its programs and buffers again when the context comes back, and uploads the series whole', () => {
    const r = makeRenderer()!;
    r.render(frame());
    const links = named('linkProgram').length;
    const lost = vi.fn();
    const restored = vi.fn();
    r.onLost(lost);
    r.onRestored(restored);
    fake.lose();
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    fake.restore();
    fake.calls.length = 0;
    r.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(restored).toHaveBeenCalledTimes(1);
    expect(named('linkProgram')).toHaveLength(links);
    expect(r.render(frame()).series).toBe(true);
    expect(named('bufferSubData')).toHaveLength(0);
    expect(named('bufferData').some((c) => c.args[1] instanceof Float32Array && (c.args[1] as Float32Array).length >= 20 * 6)).toBe(true);
    // A second loss is news again.
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(lost).toHaveBeenCalledTimes(2);
  });

  it('lets go of its share of the charts’ contexts when its context is lost, and claims one again when it comes back', () => {
    setMaxWebGLCharts(1);
    const r = makeRenderer(undefined, claimGpuContext()!)!;
    expect(gpuContextsLeft()).toBe(0);
    fake.lose();
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    // A context dropped past the browser's limit never comes back: its share is free meanwhile.
    expect(gpuContextsLeft()).toBe(1);
    fake.restore();
    r.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(gpuContextsLeft()).toBe(0);
    r.destroy();
    expect(gpuContextsLeft()).toBe(1);
  });

  it('lets a context that comes back go again, staying lost, with no share free or shaders it will not build', () => {
    setMaxWebGLCharts(1);
    const options = { compiles: true };
    const r = makeRenderer(options, claimGpuContext()!)!;
    const restored = vi.fn();
    r.onRestored(restored);
    const lose = () => {
      fake.lose();
      r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    };
    const back = () => {
      fake.restore();
      r.canvas.dispatchEvent(new Event('webglcontextrestored'));
    };
    lose();
    // Another chart takes the share it let go.
    const taken = claimGpuContext()!;
    back();
    expect(restored).not.toHaveBeenCalled();
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
    taken();
    options.compiles = false;
    lose();
    back();
    expect(restored).not.toHaveBeenCalled();
    expect(fake.loseContext).toHaveBeenCalledTimes(2);
    expect(gpuContextsLeft()).toBe(1);
    expect(r.render(frame()).series).toBe(false);
  });

  it('lets a context handed back after it was destroyed go at once', () => {
    const r = makeRenderer()!;
    fake.lose();
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    r.destroy();
    fake.restore();
    r.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
  });

  it('hands the context back on destroy and leaves the page', () => {
    const r = makeRenderer()!;
    const lost = vi.fn();
    r.onLost(lost);
    r.destroy();
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
    expect(r.canvas.isConnected).toBe(false);
    // Its own loss, asked for, is no news.
    r.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(lost).not.toHaveBeenCalled();
  });

  it('gives no renderer, a warning and the context back when a shader will not compile', () => {
    const r = makeRenderer({ compiles: false });
    expect(r).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WebGL'), expect.any(Error));
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
  });

  it('gives no renderer, quietly, where there is no WebGL 2', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(WebGLSeriesRenderer.create()).toBeNull();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
