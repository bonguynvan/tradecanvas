import type { IndicatorInputSpec } from '@tradecanvas/commons';
import { tickerOf } from '@tradecanvas/commons';

/** How many numeric parameters a label shows, so a long list stays short. */
const LABEL_NUMBERS = 3;

/**
 * Indicators whose label shows more than that, because every one of the
 * lengths named tells two instances apart: Stochastic RSI's %D smoothing is
 * its fourth, and without it a 3/3 and a 3/5 read the same; Ichimoku's
 * displacement is its fourth.
 */
const LABEL_NUMBERS_BY_ID: Readonly<Record<string, number>> = { stochrsi: 4, ichimoku: 4 };

/** A switch: a whole number that is 0 or 1. */
const isSwitch = (spec: IndicatorInputSpec | undefined): boolean => spec?.kind === 'int' && spec.min === 0 && spec.max === 1;

/** A switch's name in words: its label, else its name ('showBroken' → 'Broken', 'hidden' → 'Hidden'). */
function switchWord(name: string, spec: IndicatorInputSpec): string {
  if (spec.label) return spec.label;
  const words = name.replace(/^show(?=[A-Z])/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** How a switch away from its default is written: on ('Broken'), or off ('Reversal off'). */
export type SwitchWords = (name: string, spec: IndicatorInputSpec, on: boolean) => string;

/** In English: its word when on, '… off' when off. */
export const englishSwitchWords: SwitchWords = (name, spec, on) => {
  const word = switchWord(name, spec);
  return on ? word : `${word} off`;
};

/**
 * "EMA 20", "BB 20 2", "MACD 12 26 9": the short name (`shortName`, else the
 * id in capitals) plus up to three numeric parameters (four for Stochastic
 * RSI and Ichimoku), in the indicator's own order, so two instances of the same indicator
 * can be told apart. Given the indicator's `inputs`, a switch (a whole number
 * 0 or 1) is no number in it: at its default it is left out, away from it it
 * is named, on ("OB 5 5 Broken") or off ("Patterns 10 Reversal off"), in
 * `words` (English unless given).
 */
export function indicatorChipLabel(
  id: string,
  params: Record<string, unknown>,
  defaults?: Record<string, unknown>,
  shortName?: string,
  inputs?: Readonly<Record<string, IndicatorInputSpec>>,
  words: SwitchWords = englishSwitchWords,
): string {
  const order = defaults ? Object.keys(defaults) : Object.keys(params);
  const switches = order.filter((k) => isSwitch(inputs?.[k]));
  const turned = switches.flatMap((k) => {
    const on = Number(params[k]) >= 1;
    return on === Number(defaults?.[k]) >= 1 ? [] : [words(k, inputs![k], on)];
  });
  const numbers = order
    .filter((k) => !switches.includes(k))
    .map((k) => params[k])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .slice(0, LABEL_NUMBERS_BY_ID[id] ?? LABEL_NUMBERS)
    .map((v) => String(Number(v.toFixed(4))));
  // An indicator on another symbol is named after its ticker ("Compare ETHUSDT", "Ratio NVDA"), as the toolbar shows it.
  const symbol = typeof params.symbol === 'string' && params.symbol ? [tickerOf(params.symbol)] : [];
  const name = id === 'spread' && params.mode === 'ratio' ? 'Ratio' : shortName ?? id.toUpperCase();
  return [name, ...symbol, ...numbers, ...turned].join(' ');
}
