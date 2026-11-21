export interface Shape {
  kind: 'fill' | 'stroke';
  points: number[];
  style: string;
  alpha: number;
}

/** A canvas stand-in that keeps the text, the paths and the rectangles drawn with it. */
export function recorder(): { ctx: CanvasRenderingContext2D; texts: string[]; shapes: Shape[]; rects: number[][] } {
  const texts: string[] = [];
  const shapes: Shape[] = [];
  const rects: number[][] = [];
  let path: number[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif', fillStyle: '', strokeStyle: '', globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      return (...args: unknown[]) => {
        if (prop === 'beginPath') path = [];
        if (prop === 'moveTo' || prop === 'lineTo') path.push(Number(args[0]), Number(args[1]));
        if (prop === 'fill') shapes.push({ kind: 'fill', points: [...path], style: String(target.fillStyle), alpha: Number(target.globalAlpha) });
        if (prop === 'stroke') shapes.push({ kind: 'stroke', points: [...path], style: String(target.strokeStyle), alpha: Number(target.globalAlpha) });
        if (prop === 'fillRect') rects.push(args.map(Number));
        if (prop === 'fillText') texts.push(String(args[0]));
      };
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, shapes, rects };
}

/** As the stand-in measures: 6 px a character. */
export const measure = (text: string): number => text.length * 6;
export const W = 480;
export const H = 360;
export const plain = (v: number): string => String(Number(v.toFixed(4)));

/** Whether two lists of points hold the same points, in any order. */
export function samePoints(a: readonly number[], b: readonly number[]): boolean {
  const key = (p: readonly number[]) => Array.from({ length: p.length / 2 }, (_, i) => `${p[i * 2].toFixed(3)},${p[i * 2 + 1].toFixed(3)}`).sort().join(' ');
  return a.length === b.length && key(a) === key(b);
}


/** The first number in a colour written `rgb(r,g,b)`: how bright its red is. */
export function redOf(style: string): number {
  return Number(style.match(/\d+/)![0]);
}
