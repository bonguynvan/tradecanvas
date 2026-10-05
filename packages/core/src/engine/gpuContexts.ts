/**
 * The WebGL contexts the charts on a page hold at once. Chrome and Safari
 * keep about 16 a page and, past that, drop the oldest, whoever's it is (a
 * live chart's, a map's), never to hand it back. The charts stop short of
 * that and leave the rest to the page; a chart asked for WebGL past the limit
 * draws with Canvas 2D until a context is let go. The count is per copy of
 * the library loaded on the page.
 */

/** How many charts draw with WebGL at once, unless set otherwise. */
export const DEFAULT_MAX_WEBGL_CHARTS = 8;

let limit = DEFAULT_MAX_WEBGL_CHARTS;
let held = 0;
const waiting = new Set<() => void>();

/**
 * At most `count` charts on the page draw with WebGL at once (default 8;
 * `Infinity` for no limit). Charts that draw with WebGL already keep it when
 * the limit drops below them; it holds for those asking from then on.
 */
export function setMaxWebGLCharts(count: number): void {
  limit = Number.isNaN(count) ? DEFAULT_MAX_WEBGL_CHARTS : Math.max(0, Math.floor(count));
  if (gpuContextsLeft() > 0) wakeWaiting();
}

/** How many more charts may draw with WebGL now. */
export function gpuContextsLeft(): number {
  return Math.max(0, limit - held);
}

/** A context of the charts' share, or null when they hold all of it: the function given back lets it go (once). */
export function claimGpuContext(): (() => void) | null {
  if (held >= limit) return null;
  held++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held--;
    wakeWaiting();
  };
}

/** `callback`, once, the next time a context may be had; the function given back stops waiting. */
export function whenGpuContextFree(callback: () => void): () => void {
  waiting.add(callback);
  return () => {
    waiting.delete(callback);
  };
}

function wakeWaiting(): void {
  const callbacks = [...waiting];
  waiting.clear();
  for (const callback of callbacks) {
    try {
      callback();
    } catch (err) {
      // One that throws stops none of the others; its error still shows.
      queueMicrotask(() => {
        throw err;
      });
    }
  }
}
