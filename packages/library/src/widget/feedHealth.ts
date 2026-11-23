/** How long, seconds, a connected feed may tell nothing before it is taken for quiet. */
export const FEED_QUIET_AFTER_S = 60;

const MS = 1000;

/**
 * What the price on the chart is worth: `live`, the feed is telling; `quiet`,
 * it is connected and has told nothing for too long (a stream that stalled
 * says so no other way); `down`, it is not connected.
 */
export type FeedHealth = 'live' | 'quiet' | 'down';

export interface FeedReading {
  /** The widget has a feed of its own. With the host's bars there is none to judge. */
  hasFeed: boolean;
  /** The feed's connection as the widget holds it: `connected`, `connecting`, `error`. */
  state: string;
  /** When the feed last told anything, ms; null before it has. */
  lastUpdate: number | null;
  now: number;
  /** The wait, seconds; 0 or less never calls a connected feed quiet. */
  quietAfter: number;
  /** Whether the symbol's market is open, where its hours are known: a shut market has nothing to tell. */
  marketOpen: boolean | null;
}

/** The feed's health now. An order asked for in one press is held back unless it is `live`. */
export function feedHealth(reading: FeedReading): FeedHealth {
  if (!reading.hasFeed) return 'live';
  if (reading.state !== 'connected') return 'down';
  if (!(reading.quietAfter > 0) || reading.marketOpen === false || reading.lastUpdate === null) return 'live';
  return reading.now - reading.lastUpdate > reading.quietAfter * MS ? 'quiet' : 'live';
}
