import type { TimeFrame } from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';

/** Finer intervals a replay may step through (those dividing the chart's interval are offered). */
export const REPLAY_STEP_CANDIDATES: readonly TimeFrame[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];

/**
 * The most finer bars `'auto'` puts in one bar of the chart. At a bar a
 * second a bar lasts about 60 frames, so finer ones add nothing to see; it
 * also keeps a page of 1,000 to 16 hourly bars.
 */
export const MAX_STEPS_PER_BAR = 60;

/** Finer intervals than `chart` that divide it and that `has` (the feed serves, or the bars loaded build), finest first. */
export function replayStepChoices(chart: TimeFrame, has: (tf: TimeFrame) => boolean): TimeFrame[] {
  const current = timeframeToMs(chart);
  if (!(current > 0)) return [];
  return REPLAY_STEP_CANDIDATES.filter((tf) => {
    const ms = timeframeToMs(tf);
    return ms < current && current % ms === 0 && has(tf);
  });
}

/**
 * The interval of the finer bars for a replay of a `chart` chart: `'auto'`
 * is the finest of the choices with at most MAX_STEPS_PER_BAR to a bar; an
 * interval given is taken when it is one of them. Null when there is none.
 */
export function resolveReplayStep(step: TimeFrame | 'auto', chart: TimeFrame, has: (tf: TimeFrame) => boolean): TimeFrame | null {
  const choices = replayStepChoices(chart, has);
  if (step !== 'auto') return choices.includes(step) ? step : null;
  const current = timeframeToMs(chart);
  return choices.find((tf) => current / timeframeToMs(tf) <= MAX_STEPS_PER_BAR) ?? null;
}
