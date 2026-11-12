import type { SymbolInfo } from '@tradecanvas/commons';
import { fill, type Translator } from './i18n.js';

/** What the status bar shows of the feed: its words, and whether its dot is the delayed one. */
export interface ShownConnection {
  message: string;
  delayed: boolean;
}

/**
 * The status bar's words for a feed in `state` saying `message`: a connected
 * feed of a symbol that runs behind the market (`SymbolInfo.delayMinutes`)
 * says how far, where it would say "Live". Anything else keeps its words: a
 * feed that failed or is still connecting has more to say than its delay.
 */
export function shownConnection(
  state: string,
  message: string,
  info: Pick<SymbolInfo, 'delayMinutes'> | null | undefined,
  t: Translator,
): ShownConnection {
  const delay = info?.delayMinutes;
  if (state !== 'connected' || delay === undefined || !Number.isFinite(delay) || delay <= 0) return { message, delayed: false };
  return { message: fill(t('status.delayed'), { minutes: Math.ceil(delay) }), delayed: true };
}
