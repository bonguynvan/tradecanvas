import type { IndicatorConfig, PriceSource } from '@tradecanvas/commons';
import type { BarColumns, OutputColumns } from './columns.js';

/** One indicator to compute on the bars a request carries. */
export interface IndicatorWorkerJob {
  requestId: number;
  indicatorId: string;
  config: IndicatorConfig;
  /** The price the indicator reads in place of the close (none: the close). */
  source?: PriceSource;
}

/** Request sent from main thread → worker. */
export type IndicatorWorkerRequest =
  /**
   * Indicators to compute on one set of bars, sent as columns with their
   * buffers transferred. Each is answered on its own, by its request id.
   */
  | { type: 'calculate'; bars: BarColumns; jobs: IndicatorWorkerJob[] }
  /** Requests no longer wanted: those still waiting in the worker are skipped. */
  | { type: 'cancel'; requestIds: number[] }
  | { type: 'ping'; requestId: number };

/** Response posted from worker → main thread. */
export type IndicatorWorkerResponse =
  /** The output as columns, their buffers transferred (`columnsToOutput` makes it an output again). */
  | { type: 'result'; requestId: number; output: OutputColumns }
  | { type: 'pong'; requestId: number }
  | { type: 'error'; requestId: number; message: string };

export function isWorkerResponse(value: unknown): value is IndicatorWorkerResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { type?: unknown; requestId?: unknown };
  if (typeof v.requestId !== 'number') return false;
  return v.type === 'result' || v.type === 'pong' || v.type === 'error';
}
