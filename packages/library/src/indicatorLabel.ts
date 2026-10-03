/**
 * "EMA 20", "BB 20 2", "MACD 12 26 9": the short name (`shortName`, else the
 * id in capitals) plus up to three numeric parameters, in the indicator's own
 * order, so two instances of the same indicator can be told apart.
 */
export function indicatorChipLabel(
  id: string,
  params: Record<string, unknown>,
  defaults?: Record<string, unknown>,
  shortName?: string,
): string {
  const order = defaults ? Object.keys(defaults) : Object.keys(params);
  const numbers = order
    .map((k) => params[k])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .slice(0, 3)
    .map((v) => String(Number(v.toFixed(4))));
  // An indicator on another symbol is named after it ("Compare ETHUSDT", "Ratio ETHUSDT").
  const symbol = typeof params.symbol === 'string' && params.symbol ? [params.symbol] : [];
  const name = id === 'spread' && params.mode === 'ratio' ? 'Ratio' : shortName ?? id.toUpperCase();
  return [name, ...symbol, ...numbers].join(' ');
}
