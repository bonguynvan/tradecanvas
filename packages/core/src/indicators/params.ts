import type { IndicatorConfig } from '@tradecanvas/commons';

/**
 * Safely read a numeric indicator parameter. Falls back to `defaultValue` when
 * the param is missing or cannot be coerced to a finite number. Replaces ad-hoc
 * `config.params.foo as number` casts that silently propagate NaN.
 */
export function getNumberParam(
  config: IndicatorConfig,
  key: string,
  defaultValue: number,
): number {
  const raw = config.params[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return defaultValue;
}

/** Same as getNumberParam, but clamps to >= min and rounds to int. */
export function getIntParam(
  config: IndicatorConfig,
  key: string,
  defaultValue: number,
  min = 1,
): number {
  const v = getNumberParam(config, key, defaultValue);
  return Math.max(min, Math.floor(v));
}
