import type { IndicatorDescriptor, IndicatorValue, OverlayScale } from '@tradecanvas/commons';
import { TC_SERIES_COLORS } from '@tradecanvas/commons';
import { drawnKeys, hasHistogram, paneLogRange, paneValueRange, plotColor, plotShown } from './plots.js';
import type { IndicatorInstance } from './indicatorInstance.js';

// What the engine reads off its instances for drawing: whether one shows,
// its values on the axis, the ranges its scales fit, and the colours its
// pane already has. Kept apart from the engine, which computes them.

type ValueRange = { min: number; max: number };
type AxisValue = { value: number; color: string };

/** Whether an instance is drawn: switched on, on the chart's interval, and on its type. */
export function isShown(instance: IndicatorInstance): boolean {
  return instance.config.visible !== false && !instance.offInterval && !instance.offChartType;
}

/** The fields an instance draws and shows: a hidden plot stretches no scale. */
export function shownKeys(instance: IndicatorInstance): readonly string[] | null {
  const keys = drawnKeys(instance.plugin.descriptor);
  const plots = instance.style.plots;
  return keys && plots ? keys.filter((key) => plots[key]?.visible !== false) : keys;
}

/** Whether the instance is a price-pane overlay on `scale`. */
function onPriceScale(instance: IndicatorInstance, scale: OverlayScale): boolean {
  if (instance.plugin.descriptor.placement !== 'overlay' || instance.config.pane) return false;
  // Overlays on the left scale have a range of their own.
  return (instance.config.scale === 'left') === (scale === 'left');
}

export function latestValues(instance: IndicatorInstance): AxisValue[] {
  const series = instance.output?.series;
  const plots = instance.plugin.descriptor.plots;
  if (!series || !plots || !isShown(instance)) return [];
  const point = series[series.length - 1];
  if (!point) return [];
  const out: AxisValue[] = [];
  for (const plot of plots) {
    if (!plotShown(plot, instance.style)) continue;
    const v = point[plot.key];
    if (v !== undefined && Number.isFinite(v)) out.push({ value: v, color: plotColor(plot, instance.style, point) });
  }
  return out;
}

/** `latestValues` of every price-pane indicator on one scale. */
export function overlayLatestValues(instances: Iterable<IndicatorInstance>, scale: OverlayScale): AxisValue[] {
  const out: AxisValue[] = [];
  for (const instance of instances) {
    if (onPriceScale(instance, scale)) out.push(...latestValues(instance));
  }
  return out;
}

/** The value range of a pane's instances over bars `[from, to]`; with `log`, null when any has a value at or below zero. */
export function paneRange(members: readonly IndicatorInstance[], from: number, to: number, log: boolean): ValueRange | null {
  let range: ValueRange | null = null;
  for (const instance of members) {
    if (!isShown(instance)) continue;
    const descriptor = instance.plugin.descriptor;
    const options = {
      keys: shownKeys(instance),
      scale: descriptor.scale,
      levels: instance.config.levels ?? descriptor.levels,
      zero: hasHistogram(descriptor.plots),
    };
    const own = log ? paneLogRange(instance.output, from, to, options) : paneValueRange(instance.output, from, to, options);
    if (own === false) return null; // a value at or below zero: no log scale
    if (own) range = range ? { min: Math.min(range.min, own.min), max: Math.max(range.max, own.max) } : own;
  }
  return range;
}

/** Each shown line's value at bar `barIndex` of a pane's instances. */
export function paneValuesAt(members: readonly IndicatorInstance[], barIndex: number): number[] {
  const values: number[] = [];
  for (const instance of members) {
    if (!isShown(instance)) continue;
    const point = instance.output?.series?.[barIndex];
    if (!point) continue;
    const keys = shownKeys(instance) ?? Object.keys(point);
    for (const key of keys) {
      const value = point[key];
      if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
    }
  }
  return values;
}

/** `range` stretched to the point's values under `keys` (every field when null). */
function widen(range: ValueRange, val: IndicatorValue, keys: readonly string[] | null): void {
  if (keys) {
    for (let k = 0; k < keys.length; k++) {
      const v = val[keys[k]];
      if (v !== undefined && isFinite(v)) {
        if (v < range.min) range.min = v;
        if (v > range.max) range.max = v;
      }
    }
    return;
  }
  for (const key in val) {
    const v = val[key];
    if (v !== undefined && isFinite(v)) {
      if (v < range.min) range.min = v;
      if (v > range.max) range.max = v;
    }
  }
}

/** One overlay's values over bars `[from, to]`, stretching `range`. */
function widenByOverlay(range: ValueRange, instance: IndicatorInstance, from: number, to: number): void {
  const series = instance.output?.series;
  if (!series) return; // no array form published — nothing to scan safely in range
  // Only what is drawn: a trend flag (±1) or a session key must not
  // stretch the price scale.
  const keys = shownKeys(instance);
  const end = Math.min(to, series.length - 1);
  // Values drawn past the latest bar (Ichimoku's cloud ahead, `meta.ahead`)
  // count while that bar is in range: they sit just right of it.
  const ahead = to >= series.length - 1 ? instance.output?.meta?.ahead : undefined;
  const extra = Array.isArray(ahead) ? (ahead as (IndicatorValue | null)[]) : [];
  for (let idx = Math.max(0, from); idx <= end + extra.length; idx++) {
    const val = idx <= end ? series[idx] : extra[idx - end - 1];
    if (val) widen(range, val, keys);
  }
}

/**
 * The min/max of the visible overlays on `scale` over bars `[from, to]`.
 * Read on every autoscaled frame, so it walks `output.series` over the
 * range only, never the whole `values` map.
 */
export function overlayPriceRange(instances: Iterable<IndicatorInstance>, from: number, to: number, scale: OverlayScale): ValueRange | null {
  const range: ValueRange = { min: Infinity, max: -Infinity };
  for (const instance of instances) {
    if (!instance.output || !isShown(instance) || !onPriceScale(instance, scale)) continue;
    widenByOverlay(range, instance, from, to);
  }
  return range.min === Infinity ? null : range;
}

/**
 * The main colours of the lines drawn where an indicator would go: the
 * price pane (an overlay), another instance's pane, or a pane of its own.
 */
export function colorsInPane(
  instances: Iterable<IndicatorInstance>,
  placement: IndicatorDescriptor['placement'],
  pane: string | null,
  except?: string,
): Set<string> {
  const out = new Set<string>();
  for (const other of instances) {
    if (other.config.instanceId === except) continue;
    const there = pane !== null
      ? other.config.instanceId === pane || other.config.pane === pane
      : placement === 'overlay' && other.plugin.descriptor.placement === 'overlay' && !other.config.pane;
    if (there) out.add(other.style.colors[0]);
  }
  return out;
}

/**
 * The first palette colour no line in the indicator's pane and no other
 * instance of it starts with, so a second EMA, or an SMA next to an EMA,
 * does not look like the first.
 */
export function freeColor(
  instances: readonly IndicatorInstance[],
  id: string,
  placement: IndicatorDescriptor['placement'],
  pane: string | null,
  except?: string,
): number {
  const taken = colorsInPane(instances, placement, pane, except);
  for (const other of instances) {
    if (other.config.id === id && other.config.instanceId !== except) taken.add(other.style.colors[0]);
  }
  const free = TC_SERIES_COLORS.findIndex((c) => !taken.has(c));
  return free >= 0 ? free : taken.size % TC_SERIES_COLORS.length;
}
