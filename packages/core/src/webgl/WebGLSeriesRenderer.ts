import { resolveVolumeColors } from '@tradecanvas/commons';
import type { ViewportState } from '@tradecanvas/commons';
import type { GpuBackground, GpuDrawn, GpuFrame, GpuRect, GpuRecorder, GpuRenderer } from '../engine/gpu.js';
import { barColumns } from '../charts/pixelGrid.js';
import { gridLines } from '../axis/gridLines.js';
import { forEachPixelColumn, isDense } from '../charts/denseBars.js';
import { FLOATS_PER_BAR, SeriesUploads } from './seriesUploads.js';
import { parseColor, premultiplied, type RGBA } from './glColor.js';
import { yMapping } from './yMapping.js';
import { GlKit, type Program } from './glKit.js';
import { CommandDrawer } from './commandDrawer.js';
import { createRecorder, type Recorder } from './recorder.js';
import { CANDLE_BARS_VS, CANDLE_COLUMNS_VS, FILL_FS, RECT_FS, RECT_VS, VOLUME_BARS_VS, VOLUME_COLUMNS_VS } from './shaders.js';

const BAR_STRIDE = FLOATS_PER_BAR * 4;
/** Floats per zoomed-out column: x, high, low, volume, up. */
const COLUMN_FLOATS = 5;
const COLUMN_STRIDE = COLUMN_FLOATS * 4;
/** Floats per background rectangle: left, top, right, bottom, its premultiplied colour, then dash on and off (0 for solid). */
const RECT_FLOATS = 10;
const RECT_STRIDE = RECT_FLOATS * 4;

/** Attributes the bar and rectangle programs read. */
const ATTRIBS = ['a_ohlc', 'a_vd', 'a_col', 'a_up', 'a_rect', 'a_color', 'a_dash'];

/**
 * The background (grid, sessions), candles and volume on WebGL 2, on a
 * canvas of their own under the 2D scene, then whatever 2D drawing was
 * recorded for it (series of other kinds, indicators, panes). The series
 * lives in a GPU buffer, rewritten only where it changed; a frame sets a few
 * uniforms and makes a few draw calls. Zoomed out below a pixel per bar it
 * draws a column per pixel, like the 2D renderers.
 */
export class WebGLSeriesRenderer implements GpuRenderer {
  readonly label: string;
  private readonly gl: WebGL2RenderingContext;
  private readonly kit: GlKit;
  private readonly drawer: CommandDrawer;
  private readonly candleBars: Program;
  private readonly volumeBars: Program;
  private readonly candleColumns: Program;
  private readonly volumeColumns: Program;
  private readonly rects: Program;
  private readonly seriesBuffer: WebGLBuffer;
  private readonly columnBuffer: WebGLBuffer;
  private readonly rectBuffer: WebGLBuffer;
  private readonly uploads = new SeriesUploads();
  private gpuFloats = 0;
  private columns = new Float32Array(4096 * COLUMN_FLOATS);
  private rectValues = new Float32Array(64 * RECT_FLOATS);
  /** The plot in device pixels (left, top, right, bottom), for the bar programs' clip. */
  private clip: [number, number, number, number] = [0, 0, 0, 0];
  private lost = false;
  private lostCallback: (() => void) | null = null;

  /** A renderer on a new canvas, or null where WebGL 2 isn't there (or, asked for, only a software one). */
  static create(options: { failIfMajorPerformanceCaveat?: boolean } = {}): WebGLSeriesRenderer | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: options.failIfMajorPerformanceCaveat ?? false,
      });
    } catch (err) {
      warnUnavailable(err);
      return null;
    }
    // No WebGL 2 here: nothing to report, Canvas 2D it is.
    if (!gl) return null;
    try {
      return new WebGLSeriesRenderer(canvas, gl);
    } catch (err) {
      // A shader the driver won't compile, say: tell why, and let the context go.
      warnUnavailable(err);
      loseContext(gl);
      return null;
    }
  }

  private constructor(readonly canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.kit = new GlKit(gl);
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    this.label = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const kit = this.kit;
    this.candleBars = kit.program(CANDLE_BARS_VS, FILL_FS, ATTRIBS);
    this.volumeBars = kit.program(VOLUME_BARS_VS, FILL_FS, ATTRIBS);
    this.candleColumns = kit.program(CANDLE_COLUMNS_VS, FILL_FS, ATTRIBS);
    this.volumeColumns = kit.program(VOLUME_COLUMNS_VS, FILL_FS, ATTRIBS);
    this.rects = kit.program(RECT_VS, RECT_FS, ATTRIBS);
    this.seriesBuffer = kit.buffer();
    this.columnBuffer = kit.buffer();
    this.rectBuffer = kit.buffer();
    this.drawer = new CommandDrawer(kit);
    canvas.addEventListener('webglcontextlost', this.handleLost);
  }

  /** `callback` once the context is lost; soon (in a microtask) if it already is. */
  onLost(callback: () => void): void {
    this.lostCallback = callback;
    if (this.lost || this.gl.isContextLost()) {
      this.lost = true;
      queueMicrotask(() => {
        if (this.lostCallback === callback) callback();
      });
    }
  }

  recorder(dpr: number, measure: CanvasRenderingContext2D | null): GpuRecorder {
    return createRecorder(dpr, measure);
  }

  render(frame: GpuFrame): GpuDrawn {
    const gl = this.gl;
    if (this.lost || gl.isContextLost()) return { series: false, volume: false, background: false, recorded: false, under: false };
    const recorded = isRecorder(frame.recorded) ? frame.recorded : null;
    const under = isRecorder(frame.under) ? frame.under : null;
    const drawn: GpuDrawn = { series: frame.candles, volume: frame.volume !== null, background: frame.background !== null, recorded: recorded !== null, under: under !== null };
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // A frame that failed half-way may have left the scissor on.
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    if (frame.background) this.drawBackground(frame, frame.background);
    if (under) this.drawRecorded(frame, under);
    this.drawSeries(frame);
    if (recorded) this.drawRecorded(frame, recorded);
    return drawn;
  }

  /** Volume and candles, clipped to the plot. */
  private drawSeries(frame: GpuFrame): void {
    const gl = this.gl;
    const { data, viewport, dpr } = frame;
    if (data.length === 0 || (!frame.candles && !frame.volume)) return;
    this.syncSeries(frame);

    const from = Math.max(0, viewport.visibleRange.from);
    const to = Math.min(viewport.visibleRange.to, data.length - 1);
    if (to < from) return;

    // The series is clipped to the plot, as the 2D renderers are: the
    // scissor to the pixels it touches, the shader to the share of each.
    const { chartRect } = viewport;
    this.clip = [chartRect.x * dpr, chartRect.y * dpr, (chartRect.x + chartRect.width) * dpr, (chartRect.y + chartRect.height) * dpr];
    const left = Math.floor(this.clip[0]);
    const top = Math.floor(this.clip[1]);
    const width = Math.ceil(this.clip[2]) - left;
    const height = Math.ceil(this.clip[3]) - top;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(left, this.canvas.height - top - height, Math.max(0, width), Math.max(0, height));
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const dense = isDense(viewport);
    const columnCount = dense ? this.buildColumns(frame, from, to) : 0;
    if (frame.volume) this.drawVolume(frame, from, to, dense, columnCount);
    const { min, max } = viewport.priceRange;
    if (frame.candles && max - min !== 0) this.drawCandles(frame, from, to, dense, columnCount);
    gl.disable(gl.SCISSOR_TEST);
  }

  private drawRecorded(frame: GpuFrame, recorder: Recorder): void {
    if (recorder.commands.length === 0) return;
    this.drawer.draw(recorder.commands, this.canvas.width, this.canvas.height, (values, count) => this.drawRecordedRects(frame, values, count));
  }

  /** Recorded rectangles: device pixels, already clipped. */
  private drawRecordedRects(frame: GpuFrame, values: Float32Array, count: number): void {
    const gl = this.gl;
    const p = this.use(this.rects, frame);
    this.kit.float(p, 'u_dpr', 1);
    this.kit.int(p, 'u_union', 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, values, gl.STREAM_DRAW);
    this.bindRects(p, 0);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
  }

  destroy(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleLost);
    this.lostCallback = null;
    const gl = this.gl;
    if (!gl.isContextLost()) {
      for (const p of [this.candleBars, this.volumeBars, this.candleColumns, this.volumeColumns, this.rects]) this.kit.deleteProgram(p);
      this.drawer.destroy();
      gl.deleteBuffer(this.seriesBuffer);
      gl.deleteBuffer(this.columnBuffer);
      gl.deleteBuffer(this.rectBuffer);
      // Hand the context back now, not at garbage collection: a page keeps
      // only so many, and the browser drops the oldest (maybe a live chart's).
      loseContext(gl);
    }
    this.canvas.remove();
  }

  private readonly handleLost = (e: Event) => {
    e.preventDefault();
    if (this.lost) return;
    this.lost = true;
    this.lostCallback?.();
  };

  private syncSeries(frame: GpuFrame): void {
    const gl = this.gl;
    const change = this.uploads.sync(frame.data);
    const values = this.uploads.values;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seriesBuffer);
    if (change.full || values.length !== this.gpuFloats) {
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.DYNAMIC_DRAW);
      this.gpuFloats = values.length;
    } else if (change.to > change.from) {
      gl.bufferSubData(gl.ARRAY_BUFFER, change.from * BAR_STRIDE, values, change.from * FLOATS_PER_BAR, (change.to - change.from) * FLOATS_PER_BAR);
    }
  }

  /** Zoomed out: the bars merged per pixel column, as the 2D dense renderers merge them. */
  private buildColumns(frame: GpuFrame, from: number, to: number): number {
    const { viewport, data } = frame;
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
    const base = this.uploads.base;
    let n = 0;
    forEachPixelColumn(data, from, to, (i) => i * barUnit + offsetX, (c) => {
      if ((n + 1) * COLUMN_FLOATS > this.columns.length) {
        const bigger = new Float32Array(this.columns.length * 2);
        bigger.set(this.columns);
        this.columns = bigger;
      }
      const k = n * COLUMN_FLOATS;
      this.columns[k] = c.x;
      this.columns[k + 1] = c.high - base;
      this.columns[k + 2] = c.low - base;
      this.columns[k + 3] = c.volume;
      this.columns[k + 4] = c.close >= c.open ? 1 : 0;
      n++;
    });
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.columnBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.columns.subarray(0, n * COLUMN_FLOATS), gl.STREAM_DRAW);
    return n;
  }

  /**
   * The grid, then the other rectangles, unclipped like the 2D background.
   * The grid's coverage blends as the union of its lines: colour weighted by
   * coverage, alpha by the colour's own alpha (the blend constant) times
   * coverage. The rest blend as Canvas 2D fills do.
   */
  private drawBackground(frame: GpuFrame, background: GpuBackground): void {
    const { viewport, theme } = frame;
    const lines = background.grid ? gridLines(viewport) : { horizontal: [], vertical: [] };
    const gridCount = lines.horizontal.length + lines.vertical.length;
    const total = gridCount + background.rects.length;
    if (total === 0) return;
    if (this.rectValues.length < total * RECT_FLOATS) this.rectValues = new Float32Array(total * RECT_FLOATS * 2);
    const values = this.rectValues;
    let k = 0;
    const put = (left: number, top: number, right: number, bottom: number, color: RGBA, alpha: number, dash?: GpuRect['dash']) => {
      values[k++] = left;
      values[k++] = top;
      values[k++] = right;
      values[k++] = bottom;
      for (let i = 0; i < 4; i++) values[k++] = color[i] * alpha;
      values[k++] = dash ? dash[0] : 0;
      values[k++] = dash ? dash[1] : 0;
    };
    const gridColor = premultiplied(parseColor(theme.grid));
    const { chartRect } = viewport;
    for (const y of lines.horizontal) put(chartRect.x, y - 0.5, chartRect.x + chartRect.width, y + 0.5, gridColor, 1);
    for (const x of lines.vertical) put(x - 0.5, chartRect.y, x + 0.5, chartRect.y + chartRect.height, gridColor, 1);
    // The rectangles mostly share a colour or two.
    let lastColor = '';
    let color = gridColor;
    for (const r of background.rects) {
      if (r.color !== lastColor) {
        lastColor = r.color;
        color = premultiplied(parseColor(r.color));
      }
      put(r.x, r.y, r.x + r.width, r.y + r.height, color, r.alpha, r.dash);
    }

    const gl = this.gl;
    const p = this.use(this.rects, frame);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, values.subarray(0, k), gl.STREAM_DRAW);
    if (gridCount > 0) {
      gl.uniform1i(this.loc(p, 'u_union'), 1);
      gl.blendColor(0, 0, 0, gridColor[3]);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.bindRects(p, 0);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, gridCount);
    }
    if (background.rects.length > 0) {
      gl.uniform1i(this.loc(p, 'u_union'), 0);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.bindRects(p, gridCount);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, background.rects.length);
    }
  }

  private drawCandles(frame: GpuFrame, from: number, to: number, dense: boolean, columns: number): void {
    const { theme, viewport, dpr } = frame;
    const up = premultiplied(parseColor(theme.candleUp));
    const down = premultiplied(parseColor(theme.candleDown));
    if (dense) {
      const p = this.use(this.candleColumns, frame);
      this.vec4(p, 'u_upBody', up);
      this.vec4(p, 'u_downBody', down);
      this.bindColumns(p);
      this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, columns);
      return;
    }
    const p = this.use(this.candleBars, frame);
    this.barUniforms(p, viewport, from, dpr);
    this.vec4(p, 'u_upBody', up);
    this.vec4(p, 'u_downBody', down);
    this.vec4(p, 'u_upWick', premultiplied(parseColor(theme.candleUpWick)));
    this.vec4(p, 'u_downWick', premultiplied(parseColor(theme.candleDownWick)));
    this.bindBars(p, from);
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 12, to - from + 1);
  }

  private drawVolume(frame: GpuFrame, from: number, to: number, dense: boolean, columns: number): void {
    const { data, viewport, theme, dpr } = frame;
    let maxVol = 0;
    for (let i = from; i <= to; i++) if (data[i].volume > maxVol) maxVol = data[i].volume;
    if (maxVol === 0) return;
    const { chartRect } = viewport;
    const colors = resolveVolumeColors(theme);
    const p = this.use(dense ? this.volumeColumns : this.volumeBars, frame);
    this.float(p, 'u_volBottom', chartRect.y + chartRect.height);
    this.float(p, 'u_volScale', (chartRect.height * (frame.volume?.heightRatio ?? 0.15)) / maxVol);
    this.vec4(p, 'u_volUp', premultiplied(parseColor(colors.up)));
    this.vec4(p, 'u_volDown', premultiplied(parseColor(colors.down)));
    if (dense) {
      this.bindColumns(p);
      this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, columns);
      return;
    }
    this.barUniforms(p, viewport, from, dpr);
    this.bindBars(p, from);
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, to - from + 1);
  }

  /** Where bar `from` is, the bar step, and the wick and body widths in device pixels. */
  private barUniforms(p: Program, viewport: ViewportState, from: number, dpr: number): void {
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
    const { body, wick } = barColumns(viewport.barWidth, dpr);
    this.float(p, 'u_x0', from * barUnit + offsetX);
    this.float(p, 'u_unit', barUnit);
    this.float(p, 'u_wick', wick);
    this.float(p, 'u_body', body);
  }

  private use(p: Program, frame: GpuFrame): Program {
    const gl = this.gl;
    this.kit.use(p);
    gl.uniform2f(this.loc(p, 'u_canvas'), this.canvas.width, this.canvas.height);
    this.vec4(p, 'u_clip', this.clip);
    this.float(p, 'u_dpr', frame.dpr);
    const y = yMapping(frame.viewport, this.uploads.base);
    gl.uniform1i(this.loc(p, 'u_log'), y.log);
    gl.uniform1i(this.loc(p, 'u_invert'), y.invert);
    this.float(p, 'u_yA', y.yA);
    this.float(p, 'u_yB', y.yB);
    this.float(p, 'u_logOffset', y.logOffset);
    this.float(p, 'u_min', y.min);
    this.float(p, 'u_logFloor', y.logFloor);
    this.float(p, 'u_logK', y.logK);
    this.float(p, 'u_top', y.top);
    this.float(p, 'u_bottom', y.bottom);
    return p;
  }

  private bindBars(p: Program, from: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seriesBuffer);
    this.attrib(p, 'a_ohlc', 4, BAR_STRIDE, from * BAR_STRIDE);
    this.attrib(p, 'a_vd', 2, BAR_STRIDE, from * BAR_STRIDE + 16);
  }

  private bindRects(p: Program, from: number): void {
    this.attrib(p, 'a_rect', 4, RECT_STRIDE, from * RECT_STRIDE);
    this.attrib(p, 'a_color', 4, RECT_STRIDE, from * RECT_STRIDE + 16);
    this.attrib(p, 'a_dash', 2, RECT_STRIDE, from * RECT_STRIDE + 32);
  }

  private bindColumns(p: Program): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.columnBuffer);
    this.attrib(p, 'a_col', 4, COLUMN_STRIDE, 0);
    this.attrib(p, 'a_up', 1, COLUMN_STRIDE, 16);
  }

  private attrib(p: Program, name: string, size: number, stride: number, offset: number): void {
    this.kit.attrib(p, name, size, stride, offset);
  }

  private float(p: Program, name: string, v: number): void {
    this.kit.float(p, name, v);
  }

  private vec4(p: Program, name: string, v: readonly number[]): void {
    this.kit.vec4(p, name, v);
  }

  private loc(p: Program, name: string): WebGLUniformLocation | null {
    return this.kit.loc(p, name);
  }
}

/** A recorder of this renderer's own making. */
function isRecorder(r: unknown): r is Recorder {
  return typeof r === 'object' && r !== null && Array.isArray((r as Recorder).commands);
}

/** Let a context go now rather than at garbage collection. */
function loseContext(gl: WebGL2RenderingContext): void {
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}

function warnUnavailable(err: unknown): void {
  console.warn('TradeCanvas: WebGL renderer unavailable, drawing with Canvas 2D.', err);
}
