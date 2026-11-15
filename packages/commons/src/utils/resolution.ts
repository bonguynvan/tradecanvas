import type { TimeFrame } from '../types/ohlc.js';
import { parseTimeframe, tickBarCount } from './time.js';

/**
 * Resolutions are how many chart libraries and UDF servers name an
 * interval: a bare number is minutes (`'1'`, `'60'`, `'240'`), then a count
 * and a letter for seconds, ticks, days, weeks and months (`'15S'`, `'100T'`,
 * `'1D'`, `'W'`, `'3M'`). A missing count is 1.
 */
const RESOLUTION_PATTERN = /^([1-9]\d*)?([SsTDdWwM])?$/;

const MINUTES_PER_HOUR = 60;

/**
 * The timeframe a resolution names (`'60'` → `'1h'`, `'1D'` → `'1d'`,
 * `'W'` → `'1w'`, `'15S'` → `'15s'`, `'100T'` → `'100T'`), or null when it
 * names none. Minutes that make whole hours come back as hours.
 */
export function resolutionToTimeframe(resolution: string): TimeFrame | null {
  const match = RESOLUTION_PATTERN.exec(resolution.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const count = match[1] ? Number(match[1]) : 1;
  if (!Number.isSafeInteger(count)) return null;
  switch (match[2]) {
    case undefined:
      return count % MINUTES_PER_HOUR === 0 ? `${count / MINUTES_PER_HOUR}h` : `${count}m`;
    case 'S':
    case 's':
      return `${count}s`;
    case 'T':
      return `${count}T`;
    case 'D':
    case 'd':
      return `${count}d`;
    case 'W':
    case 'w':
      return `${count}w`;
    default:
      return `${count}M`;
  }
}

const UNIT_TO_RESOLUTION: Record<string, (count: number) => string> = {
  s: (n) => `${n}S`,
  m: (n) => `${n}`,
  h: (n) => `${n * MINUTES_PER_HOUR}`,
  d: (n) => `${n}D`,
  w: (n) => `${n}W`,
  M: (n) => `${n}M`,
};

/**
 * The resolution that names `timeframe` (`'1h'` → `'60'`, `'1d'` → `'1D'`,
 * `'100T'` → `'100T'`), or null when it is no timeframe.
 */
export function timeframeToResolution(timeframe: TimeFrame): string | null {
  const ticks = tickBarCount(timeframe);
  if (ticks !== null) return `${ticks}T`;
  const parsed = parseTimeframe(timeframe);
  return parsed ? UNIT_TO_RESOLUTION[parsed.unit](parsed.count) : null;
}
