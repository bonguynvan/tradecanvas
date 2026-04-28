import type { OHLCBar } from '@tradecanvas/commons';

export function bars(closes: number[]): OHLCBar[] {
  return closes.map((close, i) => ({
    time: i * 60_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 0,
  }));
}

export function ohlcBars(
  rows: { o: number; h: number; l: number; c: number; v?: number }[],
): OHLCBar[] {
  return rows.map((r, i) => ({
    time: i * 60_000,
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    volume: r.v ?? 0,
  }));
}

export function indicatorConfig(
  id: string,
  params: Record<string, number | string | boolean>,
) {
  return { id, instanceId: `${id}-test`, params };
}
