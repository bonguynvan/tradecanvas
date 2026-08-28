/** One in-session window, minutes-of-day in the session's timezone. */
export interface SessionWindow {
  /** Window start, minutes from midnight (e.g. 570 = 09:30). */
  startMinute: number;
  /** Window end, minutes from midnight. `endMinute < startMinute` wraps past midnight. */
  endMinute: number;
}

export interface SessionHoursConfig {
  /** Session start, minutes from midnight in the session's timezone (e.g. 570 = 09:30). */
  startMinute: number;
  /** Session end, minutes from midnight (e.g. 960 = 16:00). */
  endMinute: number;
  /** Timezone offset applied to UTC before deriving minute-of-day (e.g. -300 for EST). */
  tzOffsetMinutes: number;
  /**
   * Optional split session: a list of in-session windows within the day. When
   * present and non-empty, `startMinute`/`endMinute` are ignored and a
   * timestamp counts as in-session only if it lands inside one of these
   * windows. This lets a market with a midday recess — e.g. SET's
   * 10:00–12:30 and 14:30–16:30 — dim the lunch break the same way
   * pre-/post-market is dimmed.
   */
  windows?: SessionWindow[];
}

const DAY_MS = 86_400_000;

/** Minute-of-day (0–1439) for a timestamp in the configured timezone. */
export function minuteOfDay(timeMs: number, tzOffsetMinutes: number): number {
  const shifted = timeMs + tzOffsetMinutes * 60_000;
  const mod = ((shifted % DAY_MS) + DAY_MS) % DAY_MS;
  return Math.floor(mod / 60_000);
}

/**
 * Whether a minute-of-day falls inside a single window. `start === end` is a
 * 24h window; `end < start` wraps past midnight (e.g. a 17:00–16:00 futures
 * session).
 */
export function isInWindow(minute: number, startMinute: number, endMinute: number): boolean {
  if (startMinute === endMinute) return true; // 24h
  if (startMinute < endMinute) return minute >= startMinute && minute < endMinute;
  // Wraps midnight: in-window if after start OR before end.
  return minute >= startMinute || minute < endMinute;
}

/**
 * Whether a timestamp falls inside the regular session. With `config.windows`
 * set, the timestamp is in-session if it lands in any window (split-session
 * markets with a midday recess). Otherwise the single `startMinute`–`endMinute`
 * window is used, which still handles overnight sessions that wrap midnight.
 */
export function isRegularSession(timeMs: number, config: SessionHoursConfig): boolean {
  const m = minuteOfDay(timeMs, config.tzOffsetMinutes);
  if (config.windows && config.windows.length > 0) {
    return config.windows.some((w) => isInWindow(m, w.startMinute, w.endMinute));
  }
  return isInWindow(m, config.startMinute, config.endMinute);
}
