import type {
  IndicatorBoxDrawing,
  IndicatorDrawing,
  IndicatorLabelDrawing,
  IndicatorLineDrawing,
  IndicatorPoint,
  LineStyle,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { inkOn, lineDash } from '@tradecanvas/commons';
import { barIndexToX, priceToYMapper } from '../viewport/ScaleMapping.js';

/** The dash of a dashed line an indicator draws: as its dashed plots. */
const DASH = [6, 4];
/** Room around a label's text, px across and up and down. */
const LABEL_PAD_X = 5;
const LABEL_PAD_Y = 3;
/** A label's pointer: how far it reaches from the bubble to the point, and half its base. */
const POINTER_LENGTH = 5;
const POINTER_HALF = 4;
const LABEL_RADIUS = 3;
/** The inks a label's text is picked from, for the one that reads on its bubble. */
const LIGHT_INK = '#ffffff';
const DARK_INK = '#131722';
/** A glyph's width against the text size, generous: how far a label reaches before it is measured. */
const GLYPH_WIDTH = 0.7;

interface Draw {
  ctx: CanvasRenderingContext2D;
  viewport: ViewportState;
  toY: (value: number) => number;
  /** The indicator's first colour: a shape's that names none. */
  color: string;
  /** The chart's text colour: words with no bubble behind them. */
  ink: string;
  fontSize: number;
  fontFamily: string;
}

const xOf = (point: IndicatorPoint, viewport: ViewportState) => barIndexToX(point.bar, viewport);

/** Whether a point is one to draw at: a script in plain JS may leave one out. */
const isPoint = (point: IndicatorPoint | undefined): point is IndicatorPoint =>
  !!point && typeof point.bar === 'number' && typeof point.value === 'number';

/**
 * Whether a shape over bars `lo` to `hi`, carried on `left` and `right`,
 * reaches the bars in view, `pad` bars more each way (a label's bubble is
 * wider than its bar).
 */
function inView(lo: number, hi: number, viewport: ViewportState, left = false, right = false, pad = 1): boolean {
  const { from, to } = viewport.visibleRange;
  // Carried on right, it reaches every bar after its first; left, every bar before its last.
  return (left || lo <= to + pad) && (right || hi >= from - pad);
}

function stroke(d: Draw, color: string, width: number, style: LineStyle | undefined): void {
  const { ctx } = d;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(lineDash(style ?? 'solid', DASH, width));
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The point where the line through `a` and `b` meets the pane's left or right edge, past `b`. */
function edgePoint(a: { x: number; y: number }, b: { x: number; y: number }, d: Draw): { x: number; y: number } {
  const { x, y, width, height } = d.viewport.chartRect;
  if (a.x === b.x) return { x: b.x, y: b.y >= a.y ? y + height : y };
  const edge = b.x > a.x ? x + width : x;
  return { x: edge, y: a.y + ((b.y - a.y) * (edge - a.x)) / (b.x - a.x) };
}

function drawLine(line: IndicatorLineDrawing, d: Draw): void {
  if (!isPoint(line.from) || !isPoint(line.to)) return;
  const extend = line.extend ?? 'none';
  const lo = Math.min(line.from.bar, line.to.bar);
  const hi = Math.max(line.from.bar, line.to.bar);
  const towardsTo = line.to.bar >= line.from.bar;
  const pastTo = extend === 'right' || extend === 'both';
  const pastFrom = extend === 'left' || extend === 'both';
  if (!inView(lo, hi, d.viewport, towardsTo ? pastFrom : pastTo, towardsTo ? pastTo : pastFrom)) return;
  let a = { x: xOf(line.from, d.viewport), y: d.toY(line.from.value) };
  let b = { x: xOf(line.to, d.viewport), y: d.toY(line.to.value) };
  if (pastTo) b = edgePoint(a, b, d);
  if (pastFrom) a = edgePoint(b, a, d);
  const { ctx } = d;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  stroke(d, line.color ?? d.color, line.width ?? 1, line.lineStyle);
}

function drawBox(box: IndicatorBoxDrawing, d: Draw): void {
  if (!isPoint(box.from) || !isPoint(box.to)) return;
  if (!inView(Math.min(box.from.bar, box.to.bar), Math.max(box.from.bar, box.to.bar), d.viewport)) return;
  const xa = xOf(box.from, d.viewport);
  const xb = xOf(box.to, d.viewport);
  const ya = d.toY(box.from.value);
  const yb = d.toY(box.to.value);
  const x = Math.min(xa, xb);
  const y = Math.min(ya, yb);
  const width = Math.abs(xb - xa);
  const height = Math.abs(yb - ya);
  const { ctx } = d;
  if (box.fill) {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fillStyle = box.fill;
    ctx.fill();
  }
  const edge = box.color ?? d.color;
  if (edge !== 'transparent') {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    stroke(d, edge, box.width ?? 1, box.lineStyle);
  }
  if (box.text) {
    ctx.font = `${d.fontSize}px ${d.fontFamily}`;
    ctx.fillStyle = box.textColor ?? (edge === 'transparent' ? d.ink : edge);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // In the part of the box in view: a wide box half off the pane keeps its words on it.
    const { x: paneX, width: paneWidth } = d.viewport.chartRect;
    const left = Math.max(x, paneX);
    const right = Math.min(x + width, paneX + paneWidth);
    ctx.fillText(box.text, right > left ? (left + right) / 2 : x + width / 2, y + height / 2);
  }
}

/**
 * Where a label sits: as asked, but turned to the other side of its point
 * when that side would put it off the pane's top or bottom.
 */
function placeLabel(asked: 'above' | 'below' | 'center', py: number, needs: number, viewport: ViewportState): 'above' | 'below' | 'center' {
  const { y, height } = viewport.chartRect;
  if (asked === 'above' && py - needs < y && py + needs <= y + height) return 'below';
  if (asked === 'below' && py + needs > y + height && py - needs >= y) return 'above';
  return asked;
}

/** A label's bubble, its pointer to the point (none on it), and its text. */
function drawLabel(label: IndicatorLabelDrawing, d: Draw): void {
  if (!isPoint(label.at) || typeof label.text !== 'string') return;
  const { ctx } = d;
  const size = label.size ?? d.fontSize;
  // Its bubble's half width in bars, roughly, before it is measured: a label off the bars in view by less still shows.
  const slot = Math.max(1, d.viewport.barWidth + d.viewport.barSpacing);
  const pad = 1 + Math.ceil((label.text.length * size * GLYPH_WIDTH + LABEL_PAD_X * 2) / 2 / slot);
  if (!inView(label.at.bar, label.at.bar, d.viewport, false, false, pad)) return;
  ctx.font = `${size}px ${d.fontFamily}`;
  const px = xOf(label.at, d.viewport);
  const py = d.toY(label.at.value);
  const bubble = (label.style ?? 'bubble') === 'bubble';
  const width = ctx.measureText(label.text).width + LABEL_PAD_X * 2;
  const height = size + LABEL_PAD_Y * 2;
  const pointer = bubble ? POINTER_LENGTH : 0;
  const position = placeLabel(label.position ?? 'above', py, pointer + height, d.viewport);
  const reach = position !== 'center' ? pointer : 0;
  const top = position === 'above' ? py - reach - height : position === 'below' ? py + reach : py - height / 2;
  const left = px - width / 2;
  const fill = label.color ?? d.color;
  if (bubble) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(left, top, width, height, LABEL_RADIUS);
    else ctx.rect(left, top, width, height);
    ctx.fillStyle = fill;
    ctx.fill();
    if (reach > 0) {
      const base = position === 'above' ? top + height : top;
      ctx.beginPath();
      ctx.moveTo(px - POINTER_HALF, base);
      ctx.lineTo(px + POINTER_HALF, base);
      ctx.lineTo(px, py);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = label.textColor ?? (bubble ? inkOn(fill, LIGHT_INK, DARK_INK) : d.ink);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.text, px, top + height / 2);
}

/**
 * The labels, lines and boxes an indicator draws by itself, over its plots,
 * on its pane's scale. A shape with no colour of its own takes the
 * indicator's first; words with no bubble behind them, `ink`.
 */
export function renderIndicatorDrawings(
  ctx: CanvasRenderingContext2D,
  drawings: readonly IndicatorDrawing[],
  viewport: ViewportState,
  style: Pick<ResolvedIndicatorStyle, 'colors'>,
  fontSize: number,
  fontFamily = 'sans-serif',
  ink = '#787b86',
): void {
  if (drawings.length === 0) return;
  const d: Draw = { ctx, viewport, toY: priceToYMapper(viewport), color: style.colors[0] ?? ink, ink, fontSize, fontFamily };
  // The chart draws the next indicator on the same context: its font, alignment and pens are left as found.
  ctx.save();
  try {
    for (const drawing of drawings) {
      if (drawing.kind === 'line') drawLine(drawing, d);
      else if (drawing.kind === 'box') drawBox(drawing, d);
      else if (drawing.kind === 'label') drawLabel(drawing, d);
    }
  } finally {
    ctx.restore();
  }
}
