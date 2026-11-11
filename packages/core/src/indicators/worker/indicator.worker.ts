/// <reference lib="webworker" />
import type { IndicatorWorkerRequest } from './messages.js';
import { createIndicatorWorkerHandler } from './workerHandler.js';

// The worker the chart starts for full recomputes (`indicatorWorker: 'auto'`).
// Built inline into a chunk of its own, loaded the first time it is needed.
const ctx = self as unknown as DedicatedWorkerGlobalScope;
const handle = createIndicatorWorkerHandler((message, transfer) => ctx.postMessage(message, transfer));

ctx.addEventListener('message', (ev: MessageEvent<IndicatorWorkerRequest>) => handle(ev.data));
