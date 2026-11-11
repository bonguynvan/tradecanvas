import type { WorkerLike } from './IndicatorWorkerHost.js';

/**
 * Start the indicator worker the package ships: its script is inlined in a
 * chunk of its own, loaded the first time this is called, and started from
 * a Blob URL, so there is no file to serve. Rejects where there are no Web
 * Workers, or where the page's Content Security Policy refuses `blob:` and
 * `data:` workers. Hand the worker to `IndicatorWorkerHost`, or let the
 * chart start one with `indicatorWorker: 'auto'`.
 */
export function createIndicatorWorker(): Promise<WorkerLike> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Web Workers are not available here'));
  return import('./indicator.worker.ts?worker&inline').then(({ default: IndicatorWorker }) => new IndicatorWorker({ name: 'tradecanvas-indicators' }));
}

/**
 * `createIndicatorWorker`, failing at once (not a task later) where there
 * are no Web Workers, so a chart in jsdom or on a server computes on its
 * own thread from the start.
 */
export function spawnIndicatorWorker(): Promise<WorkerLike> {
  if (typeof Worker === 'undefined') throw new Error('Web Workers are not available here');
  return createIndicatorWorker();
}
