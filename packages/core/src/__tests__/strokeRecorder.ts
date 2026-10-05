/** A stroke as drawn: its look and the segments in its path. */
export interface RecordedStroke {
  color: unknown;
  width: number;
  dash: number[];
  alpha: number;
  segments: [number, number, number, number][];
}

/** Text as drawn, with the colour it took. */
export interface RecordedText {
  text: string;
  color: unknown;
}

/** A fill as drawn: its colour and rectangle. */
export interface RecordedFill {
  color: unknown;
  rect: [number, number, number, number];
}

/**
 * A 2D context that records strokes, text and rectangle fills: enough to
 * check what a renderer drew and in which look. Anything else is accepted
 * and ignored.
 */
export function strokeRecorder() {
  const strokes: RecordedStroke[] = [];
  const texts: RecordedText[] = [];
  const fills: RecordedFill[] = [];
  /** Paths filled (`fill()`), with their colour and alpha. */
  const pathFills: { color: unknown; alpha: number }[] = [];
  const state: Record<string | symbol, unknown> = { lineWidth: 1, globalAlpha: 1, strokeStyle: '#000', fillStyle: '#000' };
  let dash: number[] = [];
  let segments: [number, number, number, number][] = [];
  let at: [number, number] = [0, 0];
  const saved: { props: Record<string | symbol, unknown>; dash: number[] }[] = [];
  const methods: Record<string, (...args: never[]) => unknown> = {
    save: () => { saved.push({ props: { ...state }, dash: [...dash] }); },
    restore: () => {
      const top = saved.pop();
      if (!top) return;
      Object.assign(state, top.props);
      dash = top.dash;
    },
    setLineDash: (d: number[]) => { dash = [...d]; },
    getLineDash: () => dash,
    beginPath: () => { segments = []; },
    moveTo: (x: number, y: number) => { at = [x, y]; },
    lineTo: (x: number, y: number) => { segments.push([at[0], at[1], x, y]); at = [x, y]; },
    stroke: () => {
      strokes.push({ color: state.strokeStyle, width: state.lineWidth as number, dash: [...dash], alpha: state.globalAlpha as number, segments: [...segments] });
    },
    fillText: (text: string) => { texts.push({ text, color: state.fillStyle }); },
    fillRect: (x: number, y: number, w: number, h: number) => { fills.push({ color: state.fillStyle, rect: [x, y, w, h] }); },
    fill: () => { pathFills.push({ color: state.fillStyle, alpha: state.globalAlpha as number }); },
    measureText: (t: string) => ({ width: String(t).length * 6 }),
    getTransform: () => ({ a: 1, d: 1 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  const ctx = new Proxy(state, {
    get: (target, key) => {
      if (typeof key === 'string' && key in methods) return methods[key];
      if (key in target) return target[key];
      return () => {};
    },
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, strokes, texts, fills, pathFills };
}
