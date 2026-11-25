import type { DataSeries } from '@tradecanvas/commons';

/**
 * What a frame paints, as a list to compare two frames by: each fill, stroke
 * and text with the path, the state and the clip it was painted in. Saves
 * and restores with nothing painted between them, and state set and never
 * painted with, leave no trace, so two drawers that paint the same picture
 * give the same list.
 */
export interface Painted {
  ctx: CanvasRenderingContext2D;
  /** Every paint, in order. */
  paints: string[];
  /** The words painted, in order. */
  texts: string[];
  /** The rectangles filled, in order: `[x, y, width, height, fillStyle]`. */
  rects: [number, number, number, number, string][];
}

/** What a character is wide in the stand-in contexts, px: the library's chart stubs measure the same. */
export const CHAR_WIDTH = 6;

type Matrix = [number, number, number, number, number, number];

interface State {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  globalAlpha: number;
  textAlign: string;
  textBaseline: string;
  lineCap: string;
  lineJoin: string;
  globalCompositeOperation: string;
  dash: number[];
  matrix: Matrix;
  clips: string[];
  [key: string]: unknown;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** A value as it reads in a paint: numbers rounded, a gradient by its stops, a path by its steps. */
function sig(value: unknown): string {
  if (typeof value === 'number') return String(round(value));
  if (value instanceof PaintPath) return `path[${value.steps.join(' ')}]`;
  if (Array.isArray(value)) return `[${value.map(sig).join(',')}]`;
  if (value && typeof value === 'object' && 'sig' in value) return String((value as { sig: () => string }).sig());
  return String(value);
}

const PATH_STEPS = ['moveTo', 'lineTo', 'rect', 'arc', 'arcTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'ellipse', 'roundRect'] as const;

/** A `Path2D` that keeps its steps, for a context made by `painted()`. */
export class PaintPath {
  readonly steps: string[] = [];

  constructor(from?: PaintPath) {
    if (from) this.steps.push(...from.steps);
  }

  addPath(other: PaintPath): void {
    this.steps.push(...other.steps);
  }
}
for (const name of PATH_STEPS) {
  (PaintPath.prototype as unknown as Record<string, unknown>)[name] = function (this: PaintPath, ...args: unknown[]) {
    this.steps.push(`${name}(${args.map(sig).join(',')})`);
  };
}

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const FILL_STATE = ['fillStyle', 'globalAlpha', 'globalCompositeOperation'] as const;
const STROKE_STATE = ['strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'globalCompositeOperation'] as const;
const TEXT_STATE = ['font', 'textAlign', 'textBaseline'] as const;

/** A 2D context that paints nothing and keeps what it was asked to paint. */
export function painted(width = 800, height = 400): Painted {
  const paints: string[] = [];
  const texts: string[] = [];
  const rects: Painted['rects'] = [];
  let state: State = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    globalAlpha: 1,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineCap: 'butt',
    lineJoin: 'miter',
    globalCompositeOperation: 'source-over',
    dash: [],
    matrix: IDENTITY,
    clips: [],
  };
  const stack: State[] = [];
  let path: string[] = [];

  const where = (): string => (state.matrix.every((v, i) => v === IDENTITY[i]) ? '' : `@${state.matrix.map(round).join(',')}`);
  const stateOf = (keys: readonly string[]): string => keys.map((key) => `${key}=${sig(state[key])}`).join(';');
  const paint = (what: string, keys: readonly string[], extra = ''): void => {
    paints.push(`${what}${where()} {${stateOf(keys)}${extra}} clip[${state.clips.join('|')}]`);
  };
  const dashed = (): string => (state.dash.length ? `;dash=${state.dash.join(',')}` : '');
  const shape = (given: unknown): string => (given instanceof PaintPath ? given.steps.join(' ') : path.join(' '));
  const gradient = (kind: string, args: unknown[]) => {
    const stops: string[] = [];
    return { addColorStop: (at: number, color: string) => void stops.push(`${round(at)}:${color}`), sig: () => `${kind}(${args.map(sig).join(',')};${stops.join(',')})` };
  };

  const calls: Record<string, (...args: unknown[]) => unknown> = {
    save: () => void stack.push({ ...state, dash: [...state.dash], clips: [...state.clips] }),
    restore: () => {
      const before = stack.pop();
      if (before) state = before;
    },
    beginPath: () => void (path = []),
    translate: (x, y) => void (state.matrix = multiply(state.matrix, [1, 0, 0, 1, x as number, y as number])),
    scale: (x, y) => void (state.matrix = multiply(state.matrix, [x as number, 0, 0, y as number, 0, 0])),
    rotate: (angle) => {
      const cos = Math.cos(angle as number);
      const sin = Math.sin(angle as number);
      state.matrix = multiply(state.matrix, [cos, sin, -sin, cos, 0, 0]);
    },
    transform: (...m) => void (state.matrix = multiply(state.matrix, m as Matrix)),
    setTransform: (...m) => void (state.matrix = m.length === 6 ? (m as Matrix) : IDENTITY),
    resetTransform: () => void (state.matrix = IDENTITY),
    getTransform: () => {
      const [a, b, c, d, e, f] = state.matrix;
      return { a, b, c, d, e, f };
    },
    setLineDash: (dash) => void (state.dash = [...(dash as number[])]),
    getLineDash: () => [...state.dash],
    clip: (given) => void state.clips.push(`${shape(given)}${where()}`),
    fill: (given) => paint(`fill ${shape(given)}`, FILL_STATE),
    stroke: (given) => paint(`stroke ${shape(given)}`, STROKE_STATE, dashed()),
    fillRect: (x, y, w, h) => {
      rects.push([x as number, y as number, w as number, h as number, sig(state.fillStyle)]);
      paint(`fillRect(${[x, y, w, h].map(sig).join(',')})`, FILL_STATE);
    },
    strokeRect: (...args) => paint(`strokeRect(${args.map(sig).join(',')})`, STROKE_STATE, dashed()),
    clearRect: (...args) => paint(`clearRect(${args.map(sig).join(',')})`, []),
    fillText: (text, x, y) => {
      texts.push(String(text));
      paint(`fillText(${String(text)},${sig(x)},${sig(y)})`, [...FILL_STATE, ...TEXT_STATE]);
    },
    strokeText: (text, x, y) => paint(`strokeText(${String(text)},${sig(x)},${sig(y)})`, [...STROKE_STATE, ...TEXT_STATE]),
    drawImage: (...args) => paint(`drawImage(${args.slice(1).map(sig).join(',')})`, ['globalAlpha']),
    measureText: (text) => ({
      width: String(text).length * CHAR_WIDTH,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      fontBoundingBoxAscent: 9,
      fontBoundingBoxDescent: 3,
    }),
    createLinearGradient: (...args) => gradient('linear', args),
    createRadialGradient: (...args) => gradient('radial', args),
    createConicGradient: (...args) => gradient('conic', args),
    createPattern: () => ({ sig: () => 'pattern' }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    isPointInPath: () => false,
    isPointInStroke: () => false,
  };
  for (const name of PATH_STEPS) {
    calls[name] = (...args) => void path.push(`${name}(${args.map(sig).join(',')})${where()}`);
  }

  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get: (_target, prop) => {
      if (prop === 'canvas') return { width, height };
      if (typeof prop === 'string' && prop in calls) return calls[prop];
      if (prop === 'lineDashOffset') return state.lineDashOffset ?? 0;
      if (typeof prop === 'string' && prop in state) return state[prop];
      // What is neither kept nor painted with: a call that does nothing.
      return () => undefined;
    },
    set: (_target, prop, value) => {
      if (typeof prop === 'string') state[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, paints, texts, rects };
}

const DAY = 86_400_000;

/** `count` daily bars that rise and fall, with volume: the same each time. */
export function someBars(count = 120, start = Date.UTC(2026, 0, 5)): DataSeries {
  return Array.from({ length: count }, (_, i) => {
    const close = 100 + Math.sin(i / 9) * 9 + i * 0.3;
    const open = close - Math.cos(i / 4) * 1.5;
    return {
      time: start + i * DAY,
      open,
      high: Math.max(open, close) + 1.25,
      low: Math.min(open, close) - 1.5,
      close,
      volume: 1000 + Math.round(Math.cos(i / 5) * 400),
    };
  });
}

/** The first place two paint lists differ, with what each has there: a failing comparison reads as one line, not two walls. */
export function firstDifference(a: readonly string[], b: readonly string[]): string | null {
  const most = Math.max(a.length, b.length);
  for (let i = 0; i < most; i++) {
    if (a[i] !== b[i]) return `at ${i} of ${a.length} and ${b.length}:\n  ${a[i] ?? '(nothing)'}\n  ${b[i] ?? '(nothing)'}`;
  }
  return null;
}
