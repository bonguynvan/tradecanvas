/** A colour as WebGL takes it: red, green, blue, alpha, each 0 to 1. */
export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();
let probe: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;

function channel(v: string, max: number): number {
  return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / max;
}

function fromText(text: string): RGBA | null {
  const c = text.trim();
  if (c.toLowerCase() === 'transparent') return [0, 0, 0, 0];
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4), h.length === 8 ? n(6) : 1];
  }
  const fn = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(c);
  if (fn) {
    return [channel(fn[1], 255), channel(fn[2], 255), channel(fn[3], 255), fn[4] === undefined ? 1 : channel(fn[4], 1)];
  }
  return null;
}

/** A 2D context to let the browser read any CSS colour (names, hsl()…). */
function browserProbe(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  if (probe !== undefined) return probe;
  try {
    if (typeof OffscreenCanvas !== 'undefined') probe = new OffscreenCanvas(1, 1).getContext('2d');
    else if (typeof document !== 'undefined') probe = document.createElement('canvas').getContext('2d');
    else probe = null;
  } catch {
    probe = null;
  }
  return probe;
}

/**
 * A colour as the browser reads it: names and hsl() come back as hex or
 * rgb(); oklch(), color() and the like are painted on a pixel and read back.
 * Null for what Canvas 2D would reject too (it then keeps its last style, so
 * two different starting styles tell).
 */
function viaBrowser(color: string): RGBA | null {
  const ctx = browserProbe();
  if (!ctx) return null;
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  const style = String(ctx.fillStyle);
  ctx.fillStyle = '#fff';
  ctx.fillStyle = color;
  if (String(ctx.fillStyle) !== style) return null;
  const text = fromText(style);
  if (text) return text;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
}

const unreadable = new Set<string>();

/** A CSS colour as WebGL takes it, or null when it can't be read (Canvas 2D ignores such a style). */
export function readColor(color: string): RGBA | null {
  const hit = cache.get(color);
  if (hit) return hit;
  if (unreadable.has(color)) return null;
  const out = fromText(color) ?? viaBrowser(color);
  if (cache.size > 256) cache.clear();
  if (unreadable.size > 256) unreadable.clear();
  if (out) cache.set(color, out);
  else unreadable.add(color);
  return out;
}

/**
 * Any CSS colour the chart's themes use, for WebGL. Hex and rgb() are read
 * directly; anything else goes through the browser. Unreadable colours come
 * back transparent, as Canvas 2D would leave them unpainted.
 */
export function parseColor(color: string): RGBA {
  return readColor(color) ?? [0, 0, 0, 0];
}

/** The colour multiplied by its alpha, the form the canvas blends in. */
export function premultiplied([r, g, b, a]: RGBA): RGBA {
  return [r * a, g * a, b * a, a];
}
