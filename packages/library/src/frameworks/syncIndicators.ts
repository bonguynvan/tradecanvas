import type { PanelPosition } from '@tradecanvas/commons';

/**
 * An indicator a framework component shows: its id (`'rsi'`), or its id with
 * its inputs and, for one in a pane, where the pane goes.
 */
export type IndicatorSpec =
  | string
  | { id: string; params?: Record<string, number | string | boolean>; position?: PanelPosition };

/** What the components need of a chart to keep its indicators in step. */
export interface IndicatorHost {
  addIndicator(...args: [string, Record<string, number | string | boolean>?, PanelPosition?]): string | null;
  removeIndicator(instanceId: string): void;
}

/** One spec as text: the same indicator with the same inputs (in any order) and place reads the same. */
function specKey(spec: IndicatorSpec): string {
  const { id, params = {}, position = null } = typeof spec === 'string' ? { id: spec } : spec;
  return JSON.stringify([id, Object.keys(params).sort().map((k) => [k, params[k]]), position]);
}

/**
 * Brings the chart's indicators to `specs`: those no longer asked for go,
 * new ones come, and one whose inputs or place changed is put back with
 * them. `current` maps each spec (and its count, for two alike) to its
 * instance on the chart, and is kept up to date.
 */
export function syncIndicators(chart: IndicatorHost, specs: readonly IndicatorSpec[], current: Map<string, string>): void {
  const seen = new Map<string, number>();
  const wanted = specs.map((spec) => {
    const key = specKey(spec);
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return { spec, key: `${key}#${n}` };
  });
  const keys = new Set(wanted.map((w) => w.key));
  for (const [key, instanceId] of [...current]) {
    if (keys.has(key)) continue;
    chart.removeIndicator(instanceId);
    current.delete(key);
  }
  for (const { spec, key } of wanted) {
    if (current.has(key)) continue;
    const instanceId = typeof spec === 'string'
      ? chart.addIndicator(spec)
      : spec.position !== undefined
        ? chart.addIndicator(spec.id, spec.params ?? {}, spec.position)
        : chart.addIndicator(spec.id, spec.params ?? {});
    if (instanceId) current.set(key, instanceId);
  }
}
