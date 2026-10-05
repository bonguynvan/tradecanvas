import type { GlKit, Program } from './glKit.js';
import type { Box, GpuCommand, GpuPaint } from './recordedCommands.js';
import { SPAN_FLOATS } from './polygonSpans.js';
import { DISC_FS, DISC_VS, SPAN_FS, SPAN_VS, STROKE_FS, STROKE_VS } from './recordedShaders.js';

/** Floats per stroke point: x, y, w, length along. */
const POINT_FLOATS = 4;
const POINT_STRIDE = POINT_FLOATS * 4;
const SPAN_STRIDE = SPAN_FLOATS * 4;
/** Floats per disc: x, y, radius, premultiplied colour. */
const DISC_FLOATS = 7;
const DISC_STRIDE = DISC_FLOATS * 4;

/** How rectangles are drawn: the background's rectangle program, given its instances. */
export type DrawRects = (values: Float32Array, count: number) => void;

/**
 * Draws recorded Canvas 2D commands, in order, over what the renderer drew
 * before: strokes, polygons (as spans that hold each pixel once), discs and
 * rectangles, their coverage worked out per pixel. No stencil: a stencil
 * buffer the size of the canvas costs a clear every frame, used or not.
 */
export class CommandDrawer {
  private readonly stroke: Program;
  private readonly span: Program;
  private readonly disc: Program;
  private readonly buffer: WebGLBuffer;

  constructor(private readonly kit: GlKit) {
    this.stroke = kit.program(STROKE_VS, STROKE_FS, ['a_p0', 'a_p1', 'a_p2', 'a_p3', 'a_p4', 'a_p5']);
    this.span = kit.program(SPAN_VS, SPAN_FS, ['a_x', 'a_ab', 'a_ends']);
    this.disc = kit.program(DISC_VS, DISC_FS, ['a_disc', 'a_color']);
    this.buffer = kit.buffer();
  }

  /** Draw `commands` on a canvas `width` × `height` device pixels; rectangles through `rects`. */
  draw(commands: readonly GpuCommand[], width: number, height: number, rects: DrawRects): void {
    const gl = this.kit.gl;
    gl.enable(gl.BLEND);
    for (let i = 0; i < commands.length; i++) {
      const c = commands[i];
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.SCISSOR_TEST);
      if (c.type === 'rects') {
        // Rectangles one after another (one per step, say) in one draw.
        const run: number[][] = [c.values];
        while (commands[i + 1]?.type === 'rects') run.push((commands[++i] as typeof c).values);
        this.drawRects(run, rects);
      } else if (c.type === 'stroke') this.drawStroke(c, width, height);
      else if (c.type === 'fill') this.drawFill(c, width, height);
      else this.drawDiscs(c.values, c.clip, width, height);
    }
    gl.disable(gl.SCISSOR_TEST);
  }

  destroy(): void {
    for (const p of [this.stroke, this.span, this.disc]) this.kit.deleteProgram(p);
    this.kit.gl.deleteBuffer(this.buffer);
  }

  private upload(values: Float32Array): void {
    const gl = this.kit.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, values, gl.STREAM_DRAW);
  }

  private common(p: Program, clip: Box, width: number, height: number): boolean {
    const kit = this.kit;
    if (!kit.scissor(clip.x0, clip.y0, clip.x1, clip.y1, width, height)) return false;
    kit.use(p);
    kit.vec2(p, 'u_canvas', width, height);
    kit.vec4(p, 'u_clip', [clip.x0, clip.y0, Math.min(clip.x1, width), Math.min(clip.y1, height)]);
    return true;
  }

  /** Rectangles in the background program's layout: rectangle, colour, no dash. */
  private drawRects(runs: readonly (readonly number[])[], rects: DrawRects): void {
    let count = 0;
    for (const values of runs) count += values.length / 8;
    const out = new Float32Array(count * 10);
    let n = 0;
    for (const values of runs) {
      for (let i = 0; i < values.length; i += 8, n++) {
        for (let k = 0; k < 8; k++) out[n * 10 + k] = values[i + k];
      }
    }
    rects(out, count);
  }

  private drawStroke(c: Extract<GpuCommand, { type: 'stroke' }>, width: number, height: number): void {
    const p = this.stroke;
    if (!this.common(p, c.clip, width, height)) return;
    const kit = this.kit;
    kit.vec4(p, 'u_color', c.color);
    kit.float(p, 'u_hw', c.width / 2);
    kit.int(p, 'u_cap', c.cap);
    kit.vec4(p, 'u_dash', c.dash ?? [0, 0, 0, 0]);
    this.upload(new Float32Array(c.points));
    for (let k = 0; k < 6; k++) kit.attrib(p, `a_p${k}`, 4, POINT_STRIDE, k * POINT_STRIDE);
    const segments = c.points.length / POINT_FLOATS - 5;
    if (segments > 0) kit.gl.drawArraysInstanced(kit.gl.TRIANGLES, 0, 6, segments);
  }

  /** A polygon's spans in its paint, clipped. */
  private drawFill(c: Extract<GpuCommand, { type: 'fill' }>, width: number, height: number): void {
    const kit = this.kit;
    const box = c.bounds;
    if (!kit.scissor(box.x0, box.y0, box.x1, box.y1, width, height)) return;
    const p = kit.use(this.span);
    kit.vec2(p, 'u_canvas', width, height);
    kit.vec4(p, 'u_clip', [c.clip.x0, c.clip.y0, Math.min(c.clip.x1, width), Math.min(c.clip.y1, height)]);
    this.upload(new Float32Array(c.spans));
    kit.attrib(p, 'a_x', 2, SPAN_STRIDE, 0);
    kit.attrib(p, 'a_ab', 4, SPAN_STRIDE, 8);
    kit.attrib(p, 'a_ends', 2, SPAN_STRIDE, 24);
    this.paint(p, c.paint);
    kit.gl.drawArraysInstanced(kit.gl.TRIANGLES, 0, 6, c.spans.length / SPAN_FLOATS);
  }

  private paint(p: Program, paint: GpuPaint): void {
    const kit = this.kit;
    if (paint.kind === 'solid') {
      kit.int(p, 'u_kind', 0);
      kit.vec4(p, 'u_color', paint.color);
      return;
    }
    kit.int(p, 'u_kind', 1);
    kit.vec4(p, 'u_line', [paint.x0, paint.y0, paint.x1, paint.y1]);
    const offsets = [0, 0, 0, 0];
    paint.stops.forEach((s, i) => { offsets[i] = s.offset; });
    kit.vec4(p, 'u_offsets', offsets);
    kit.int(p, 'u_stops', paint.stops.length);
    for (let i = 0; i < 4; i++) kit.vec4(p, `u_stop${i}`, (paint.stops[i] ?? paint.stops[paint.stops.length - 1]).color);
  }

  private drawDiscs(values: readonly number[], clip: Box, width: number, height: number): void {
    const p = this.disc;
    if (!this.common(p, clip, width, height)) return;
    this.upload(new Float32Array(values));
    this.kit.attrib(p, 'a_disc', 3, DISC_STRIDE, 0);
    this.kit.attrib(p, 'a_color', 4, DISC_STRIDE, 12);
    this.kit.gl.drawArraysInstanced(this.kit.gl.TRIANGLES, 0, 6, values.length / DISC_FLOATS);
  }
}
