import type { DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';

/** Request sent from main thread → worker. */
export type IndicatorWorkerRequest =
  | {
      type: 'calculate';
      requestId: number;
      indicatorId: string;
      config: IndicatorConfig;
      data: DataSeries;
    }
  | { type: 'ping'; requestId: number };

/** Response posted from worker → main thread. */
export type IndicatorWorkerResponse =
  | { type: 'result'; requestId: number; output: IndicatorOutput }
  | { type: 'pong'; requestId: number }
  | { type: 'error'; requestId: number; message: string };

export function isWorkerResponse(value: unknown): value is IndicatorWorkerResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { type?: unknown; requestId?: unknown };
  if (typeof v.requestId !== 'number') return false;
  return v.type === 'result' || v.type === 'pong' || v.type === 'error';
}
