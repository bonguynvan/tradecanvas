/** How many numeric parameters a label shows, so a long list stays short. */
const LABEL_NUMBERS = 3;

/**
 * Indicators whose label shows more than that, because every one of the
 * lengths named tells two instances apart: Stochastic RSI's %D smoothing is
 * its fourth, and without it a 3/3 and a 3/5 read the same.
 */
const LABEL_NUMBERS_BY_ID: Readonly<Record<string, number>> = { stochrsi: 4 };

/**
 * "EMA 20", "BB 20 2", "MACD 12 26 9": the short name (`shortName`, else the
 * id in capitals) plus up to three numeric parameters (four for Stochastic
 * RSI), in the indicator's own order, so two instances of the same indicator
 * can be told apart.
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
    .slice(0, LABEL_NUMBERS_BY_ID[id] ?? LABEL_NUMBERS)
    .map((v) => String(Number(v.toFixed(4))));
  // An indicator on another symbol is named after it ("Compare ETHUSDT", "Ratio ETHUSDT").
  const symbol = typeof params.symbol === 'string' && params.symbol ? [params.symbol] : [];
  const name = id === 'spread' && params.mode === 'ratio' ? 'Ratio' : shortName ?? id.toUpperCase();
  return [name, ...symbol, ...numbers].join(' ');
}
