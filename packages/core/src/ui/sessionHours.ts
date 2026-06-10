export interface SessionHoursConfig {
  /** Session start, minutes from midnight in the session's timezone (e.g. 570 = 09:30). */
  startMinute: number;
  /** Session end, minutes from midnight (e.g. 960 = 16:00). */
  endMinute: number;
  /** Timezone offset applied to UTC before deriving minute-of-day (e.g. -300 for EST). */
  tzOffsetMinutes: number;
}

const DAY_MS = 86_400_000;

/** Minute-of-day (0–1439) for a timestamp in the configured timezone. */
export function minuteOfDay(timeMs: number, tzOffsetMinutes: number): number {
  const shifted = timeMs + tzOffsetMinutes * 60_000;
  const mod = ((shifted % DAY_MS) + DAY_MS) % DAY_MS;
  return Math.floor(mod / 60_000);
}

/**
 * Whether a timestamp falls inside the regular session. Handles overnight
 * sessions where `endMinute < startMinute` (e.g. a 17:00–16:00 futures session)
 * by treating the window as wrapping past midnight.
 */
export function isRegularSession(timeMs: number, config: SessionHoursConfig): boolean {
  const m = minuteOfDay(timeMs, config.tzOffsetMinutes);
  const { startMinute: s, endMinute: e } = config;
  if (s === e) return true; // 24h session
  if (s < e) return m >= s && m < e;
  // Wraps midnight: in-session if after start OR before end.
  return m >= s || m < e;
}
