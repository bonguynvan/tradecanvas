import type {
  IndicatorPlugin,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorDescriptor,
  ResolvedIndicatorStyle,
  IndicatorStyleConfig,
  IndicatorPlotStyle,
  IndicatorIntervals,
  DataSeries,
  OHLCBar,
  ViewportState,
  OverlayScale,
} from '@tradecanvas/commons';
import { TC_SERIES_COLORS, isUtcTimeZone, isValidTimeZone } from '@tradecanvas/commons';
import { drawnKeys, hasHistogram, paneLogRange, paneValueRange, plotColor, plotShown } from './plots.js';
import { alignOutput, emptyOutput, inputSource, lineSourceBars, priceSourceBars, sourceParam } from './sources.js';
import { cleanIntervals, shownOnInterval } from './intervals.js';
import { copyIntervals, copyPlots, isSeriesPalette, paletteFrom } from './palette.js';
import { BUILT_IN_PLUGINS } from './builtIns.js';
import { SYMBOL_INDICATOR_IDS } from './symbols/symbolIndicators.js';

interface IndicatorInstance {
  plugin: IndicatorPlugin;
  config: IndicatorConfig;
  output: IndicatorOutput | null;
  style: ResolvedIndicatorStyle;
  /** Bars with `close` replaced by the price source, kept for incremental updates. */
  sourceBars?: OHLCBar[];
  /** What an indicator read from another's line was computed on, kept for incremental updates. */
  lineInput?: LineInput;
  /**
   * The first bar whose values the last computation may have changed: what
   * indicators read from this one must recompute from. 0 after a full
   * computation.
   */
  changedFrom: number;
  /** Not shown on the chart's interval (its `intervals` leave it out). */
  offInterval: boolean;
  /** Not shown on the chart's type: it reads another symbol by time, and the bars drawn carry none. */
  offChartType: boolean;
}

interface LineInput {
  sourceId: string;
  key: string;
  /** Index in the chart's bars of the line's first value. */
  start: number;
  /** Bars made of the line, from `start` on. */
  bars: OHLCBar[];
  /** The plugin's own output over `bars`. */
  raw: IndicatorOutput;
  /** `raw` re-indexed to the chart's bars: the instance's output. */
  aligned: IndicatorOutput;
}

let nextId = 1;

/** An active indicator instance as listed by `getActiveIndicators`. */
export interface ActiveIndicatorInfo {
  instanceId: string;
  id: string;
  params: Record<string, unknown>;
  descriptor: IndicatorDescriptor;
  visible: boolean;
  /** Whether it is drawn now: visible, on the chart's interval, and on its type. */
  shown: boolean;
  /**
   * True while the chart's type draws bars with no time of their own (Renko,
   * Kagi, line break, point & figure, range bars) and the indicator reads
   * another symbol by time (a compare on its own scale or in a pane, a
   * spread, a ratio, a correlation): it is not drawn there.
   */
  offChartType?: true;
  /** The intervals it shows on, when not all. */
  intervals?: IndicatorIntervals;
  /** The instance whose pane it is drawn in, when not its own. */
  pane?: string;
}

/** Whether a plugin's values move with the exchange's zone: it says so, or it is the host's and says nothing. */
function readsZone(plugin: IndicatorPlugin): boolean {
  return plugin.descriptor.readsExchangeTimeZone ?? !BUILT_IN_PLUGINS.has(plugin);
}

/**
 * A computation waiting for the next read: every instance from bar `from` on
 * (Infinity: none of them), and the ones in `full` from the start.
 */
interface PendingComputation {
  data: DataSeries;
  from: number;
  full: Set<string>;
}

export class IndicatorEngine {
  private registry = new Map<string, IndicatorPlugin>();
  private instances = new Map<string, IndicatorInstance>();
  /** The style each kind of indicator starts with, by id (`setStyleDefaults`). */
  private styleDefaults = new Map<string, IndicatorStyleConfig>();
  /** Instances in computing order (each after the indicators it reads); null = recompute. */
  private order: IndicatorInstance[] | null = null;
  /** A recalculation waiting for the next read (`deferRecalculateFrom`, a change of zone). */
  private pending: PendingComputation | null = null;
  /** The chart's interval, which the instances' `intervals` are read against (null: not known). */
  private timeframe: string | null = null;
  /** The exchange's zone, given to every instance as `config.exchangeTimeZone` (null: UTC's days). */
  private exchangeTimeZone: string | null = null;
  /** Whether the bars drawn carry times of their own: not Renko bricks, Kagi lines and the like. */
  private barsTimed = true;

  register(plugin: IndicatorPlugin): void {
    this.registry.set(plugin.descriptor.id, plugin);
  }

  getAvailableIndicators(): IndicatorDescriptor[] {
    return Array.from(this.registry.values()).map((p) => p.descriptor);
  }

  /**
   * Add an instance of indicator `id`. `options.pane` draws it in another
   * instance's pane, on that pane's scale.
   */
  addIndicator(
    id: string,
    params: Record<string, number | string | boolean> = {},
    data?: DataSeries,
    options: { pane?: string; scale?: OverlayScale; instanceId?: string } = {},
  ): string {
    const plugin = this.registry.get(id);
    if (!plugin) throw new Error(`Unknown indicator: ${id}`);

    const instanceId = this.claimInstanceId(id, options.instanceId);
    const config: IndicatorConfig = {
      id,
      instanceId,
      params: { ...plugin.descriptor.defaultConfig, ...params } as Record<string, number | string | boolean>,
      visible: true,
    };
    if (options.pane && this.canHost(options.pane)) config.pane = options.pane;
    if (options.scale === 'left' && plugin.descriptor.placement === 'overlay' && !config.pane) config.scale = 'left';
    if (this.exchangeTimeZone) config.exchangeTimeZone = this.exchangeTimeZone;

    // The kind's defaults (setStyleDefaults) under what the config sets.
    const defaults = this.styleDefaults.get(id);
    const plots = { ...defaults?.plots, ...config.style?.plots };
    const style: ResolvedIndicatorStyle = {
      colors: config.style?.colors ?? defaults?.colors?.slice() ?? paletteFrom(this.freeColor(id, plugin.descriptor.placement, config.pane ?? null)),
      lineWidths: config.style?.lineWidths ?? defaults?.lineWidths?.slice() ?? [1.5],
      opacity: config.style?.opacity ?? defaults?.opacity ?? 1,
      ...(Object.keys(plots).length > 0 ? { plots: copyPlots(plots) } : {}),
    };

    this.flush();
    const instance: IndicatorInstance = { plugin, config, output: null, style, changedFrom: 0, offInterval: false, offChartType: false };
    this.placeOnChartType(instance);
    this.instances.set(instanceId, instance);
    this.order = null;
    if (data) this.compute(instance, data);
    return instanceId;
  }

  removeIndicator(instanceId: string): void {
    this.instances.delete(instanceId);
    this.order = null;
  }

  /**
   * Change an instance's parameters; it and the indicators that read it are
   * recomputed. A source that would read, through other indicators, from the
   * instance itself is ignored (the old source stays).
   */
  updateIndicator(instanceId: string, params: Record<string, number | string | boolean>, data?: DataSeries): void {
    this.flush();
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    const name = sourceParam(instance.plugin.descriptor);
    if (name && name in params && this.readsFromItself(instanceId, { ...instance.config.params, ...params })) {
      const { [name]: _ignored, ...rest } = params;
      params = rest;
    }
    Object.assign(instance.config.params, params);
    delete instance.sourceBars;
    delete instance.lineInput;
    this.order = null;
    if (!data) return;
    const affected = new Set([instanceId, ...this.getDependents(instanceId)]);
    for (const each of this.ordered()) {
      if (affected.has(each.config.instanceId)) this.compute(each, data);
    }
  }

  recalculateAll(data: DataSeries): void {
    // Everything is computed again: a tick waiting is part of it.
    this.pending = null;
    for (const instance of this.ordered()) this.compute(instance, data);
  }

  /**
   * `recalculateFrom`, later: before the next read of a value (a frame, an
   * alert check, the legend), once for all the ticks that came since, from
   * the earliest bar they touched. A live feed sending ticks faster than
   * frames then costs one recalculation a frame, not one a tick.
   */
  deferRecalculateFrom(data: DataSeries, from: number): void {
    const pending = this.waitingOn(data);
    pending.from = Math.min(pending.from, from);
  }

  /** The computation waiting on `data`: the one there is, or a new one, once one on another series has run. */
  private waitingOn(data: DataSeries): PendingComputation {
    const pending = this.pending;
    if (pending && pending.data === data) return pending;
    // Another series than the one waiting: that one first.
    this.flush();
    this.pending = { data, from: Infinity, full: new Set() };
    return this.pending;
  }

  /** Run a deferred recalculation now, if one is waiting. */
  flush(): void {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    const { data, from, full } = pending;
    for (const instance of this.ordered()) {
      if (full.has(instance.config.instanceId)) this.compute(instance, data);
      else if (from !== Infinity) this.compute(instance, data, from);
    }
  }

  /**
   * Recompute after bars at index `from` and later changed or were appended,
   * with bars `[0, from)` untouched — a live tick (`from = length - 1`) or a
   * new bar (`from = length - 2`, re-finalising the bar that just closed).
   *
   * Plugins with an incremental `update` only touch the changed tail, so a
   * tick costs O(1)–O(period) per indicator instead of O(history); a full
   * `calculate` over 20k bars took ~30ms per tick on a desktop. Plugins
   * without `update`, or whose `update` declines, are fully recalculated.
   */
  recalculateFrom(data: DataSeries, from: number): void {
    // A tick waiting joins this one, from the earlier of the two bars.
    this.deferRecalculateFrom(data, from);
    this.flush();
  }

  /**
   * Compute one instance from its source: the bars, a price source in
   * `close`, or another indicator's line. With `from`, bars before it are
   * unchanged (and so are the lines read from them) and an incremental
   * `update` is tried first.
   */
  private compute(instance: IndicatorInstance, data: DataSeries, from?: number): void {
    const { plugin, config } = instance;
    const source = inputSource(plugin.descriptor, config.params);
    if (source.kind === 'line') {
      this.computeFromLine(instance, data, source.instanceId, source.key, from);
      return;
    }
    delete instance.lineInput;
    let bars: DataSeries = data;
    if (source.kind === 'price') {
      instance.sourceBars = priceSourceBars(data, source.source, instance.sourceBars ?? null, from ?? 0);
      bars = instance.sourceBars;
    } else {
      delete instance.sourceBars;
    }
    const prev = instance.output;
    let next: IndicatorOutput | null = null;
    if (from !== undefined && from > 0 && prev && plugin.update) next = plugin.update(bars, config, prev, from);
    instance.changedFrom = next ? Math.max(0, from! - (plugin.revisesBefore?.(config) ?? 0)) : 0;
    instance.output = next ?? plugin.calculate(bars, config);
  }

  /**
   * Compute an instance from another indicator's line `key`. On a tick, only
   * the bars made of the changed part of the line are rebuilt — from `from`,
   * or from wherever the line itself last changed if that is earlier (a
   * fractal confirmed late, a repainting ZigZag) — and the plugin's `update`
   * runs on them. When the line changed before its first value, or before
   * the start of what is kept, it is recomputed in full.
   */
  private computeFromLine(instance: IndicatorInstance, data: DataSeries, sourceId: string, key: string, from?: number): void {
    const { plugin, config } = instance;
    const source = this.instances.get(sourceId);
    const line = source?.output?.series;
    const cached = instance.lineInput;
    const changed = from === undefined ? undefined : Math.min(from, source?.changedFrom ?? 0);
    if (
      changed !== undefined && line && plugin.update && cached && cached.raw.series && cached.aligned.series
      && cached.sourceId === sourceId && cached.key === key
      && cached.start < changed && changed <= cached.start + cached.bars.length
    ) {
      const { start, bars } = cached;
      bars.length = data.length - start;
      let last = bars[changed - 1 - start].close;
      for (let i = changed; i < data.length; i++) {
        const v = line[i]?.[key];
        if (v !== undefined && Number.isFinite(v)) last = v;
        bars[i - start] = { time: data[i].time, open: last, high: last, low: last, close: last, volume: data[i].volume };
      }
      const next = plugin.update(bars, config, cached.raw, changed - start);
      if (next?.series) {
        // What this update rewrote, including bars before `changed` it may revise.
        const rewritten = Math.max(start, changed - (plugin.revisesBefore?.(config) ?? 0));
        cached.raw = next;
        if (start === 0) {
          cached.aligned = next;
        } else {
          const series = cached.aligned.series;
          series.length = data.length;
          for (let i = rewritten; i < data.length; i++) series[i] = next.series[i - start] ?? null;
          cached.aligned.values = next.values;
          cached.aligned.meta = next.meta;
        }
        instance.output = cached.aligned;
        instance.changedFrom = rewritten;
        return;
      }
    }
    instance.changedFrom = 0;
    const input = lineSourceBars(data, line, key);
    if (!input) {
      delete instance.lineInput;
      instance.output = emptyOutput(data.length);
      return;
    }
    const raw = plugin.calculate(input.bars, config);
    const aligned = alignOutput(raw, input.start, data.length);
    instance.lineInput = { sourceId, key, start: input.start, bars: input.bars, raw, aligned };
    instance.output = aligned;
  }

  /** Instances ordered so each comes after the indicators it reads (insertion order otherwise). */
  private ordered(): IndicatorInstance[] {
    if (this.order) return this.order;
    const out: IndicatorInstance[] = [];
    const state = new Map<string, 'visiting' | 'done'>();
    const visit = (instance: IndicatorInstance): void => {
      const id = instance.config.instanceId;
      if (state.get(id)) return; // done, or a cycle: leave it where it is
      state.set(id, 'visiting');
      const source = inputSource(instance.plugin.descriptor, instance.config.params);
      const dep = source.kind === 'line' ? this.instances.get(source.instanceId) : undefined;
      if (dep) visit(dep);
      state.set(id, 'done');
      out.push(instance);
    };
    for (const instance of this.instances.values()) visit(instance);
    this.order = out;
    return out;
  }

  /** Whether `params` would make `instanceId` read, directly or through others, from its own lines. */
  private readsFromItself(instanceId: string, params: Readonly<Record<string, unknown>>): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    let source = inputSource(instance.plugin.descriptor, params);
    const seen = new Set<string>();
    while (source.kind === 'line') {
      if (source.instanceId === instanceId) return true;
      if (seen.has(source.instanceId)) return false;
      seen.add(source.instanceId);
      const next = this.instances.get(source.instanceId);
      if (!next) return false;
      source = inputSource(next.plugin.descriptor, next.config.params);
    }
    return false;
  }

  /** Whether `hostId` owns a pane others can be drawn in: a pane indicator not itself drawn in another's pane. */
  private canHost(hostId: string): boolean {
    const host = this.instances.get(hostId);
    return !!host && host.plugin.descriptor.placement === 'panel' && !host.config.pane;
  }

  /** The instances that read `instanceId`'s lines, directly or through others. */
  getDependents(instanceId: string): string[] {
    const out: string[] = [];
    const seen = new Set([instanceId]);
    const queue = [instanceId];
    while (queue.length) {
      const id = queue.shift()!;
      for (const instance of this.instances.values()) {
        const source = inputSource(instance.plugin.descriptor, instance.config.params);
        const other = instance.config.instanceId;
        if (source.kind === 'line' && source.instanceId === id && !seen.has(other)) {
          seen.add(other);
          out.push(other);
          queue.push(other);
        }
      }
    }
    return out;
  }

  /**
   * The id for a new instance: `wanted` when it is free (an undo puts an
   * indicator back as it was), else a fresh one. Fresh ids never take one in
   * use, and the counter moves past an id put back, so none is handed out twice.
   */
  private claimInstanceId(id: string, wanted?: string): string {
    if (wanted && !this.instances.has(wanted)) {
      const n = Number(/_(\d+)$/.exec(wanted)?.[1]);
      if (Number.isSafeInteger(n) && n >= nextId) nextId = n + 1;
      return wanted;
    }
    let fresh = `tc_${id}_${nextId++}`;
    while (this.instances.has(fresh)) fresh = `tc_${id}_${nextId++}`;
    return fresh;
  }

  /** The instances drawn in `hostId`'s pane besides it, in order. */
  getPaneMembers(hostId: string): string[] {
    const out: string[] = [];
    for (const instance of this.instances.values()) {
      if (instance.config.pane === hostId) out.push(instance.config.instanceId);
    }
    return out;
  }

  /**
   * Move an instance into another instance's pane (`null`: back to its own
   * place). Still on its default colours, it takes one no line there has.
   */
  setPane(instanceId: string, hostId: string | null): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance || hostId === instanceId || (hostId !== null && !this.canHost(hostId))) return false;
    if (hostId === null) delete instance.config.pane;
    else {
      instance.config.pane = hostId;
      // A pane has its own value scale: the left price scale is only for overlays.
      delete instance.config.scale;
    }
    if (isSeriesPalette(instance.style.colors)) {
      const placement = instance.plugin.descriptor.placement;
      const pane = instance.config.pane ?? null;
      if (this.colorsInPane(placement, pane, instanceId).has(instance.style.colors[0])) {
        instance.style.colors = paletteFrom(this.freeColor(instance.config.id, placement, pane, instanceId));
      }
    }
    return true;
  }

  /**
   * The main colours of the lines drawn where an indicator would go: the
   * price pane (an overlay), another instance's pane, or a pane of its own.
   */
  private colorsInPane(placement: IndicatorDescriptor['placement'], pane: string | null, except?: string): Set<string> {
    const out = new Set<string>();
    for (const other of this.instances.values()) {
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
  private freeColor(id: string, placement: IndicatorDescriptor['placement'], pane: string | null, except?: string): number {
    const taken = this.colorsInPane(placement, pane, except);
    for (const other of this.instances.values()) {
      if (other.config.id === id && other.config.instanceId !== except) taken.add(other.style.colors[0]);
    }
    const free = TC_SERIES_COLORS.findIndex((c) => !taken.has(c));
    return free >= 0 ? free : taken.size % TC_SERIES_COLORS.length;
  }

  getOutput(instanceId: string): IndicatorOutput | null {
    this.flush();
    return this.instances.get(instanceId)?.output ?? null;
  }

  /** Price-pane overlays; those on the left scale draw with `leftViewport` (its range). */
  renderOverlays(ctx: CanvasRenderingContext2D, viewport: ViewportState, leftViewport?: ViewportState): void {
    for (const draw of this.overlayDraws(viewport, leftViewport)) draw(ctx);
  }

  /** The visible overlays as one drawing each, in order, for any 2D context (the chart's, or one recording for the GPU). */
  overlayDraws(viewport: ViewportState, leftViewport?: ViewportState): ((ctx: CanvasRenderingContext2D) => void)[] {
    this.flush();
    const draws: ((ctx: CanvasRenderingContext2D) => void)[] = [];
    for (const instance of this.instances.values()) {
      const output = instance.output;
      if (!output || !isShown(instance)) continue;
      if (instance.plugin.descriptor.placement !== 'overlay' || instance.config.pane) continue;
      const vp = instance.config.scale === 'left' ? leftViewport ?? viewport : viewport;
      draws.push((ctx) => instance.plugin.render(ctx, output, vp, instance.style));
    }
    return draws;
  }

  /** Whether any visible overlay is drawn on the left scale. */
  hasLeftScaleOverlays(): boolean {
    for (const instance of this.instances.values()) {
      if (instance.config.scale === 'left' && isShown(instance)) return true;
    }
    return false;
  }

  /**
   * Put an overlay on the left scale or back on the price scale. False for
   * an unknown instance or one that isn't a price-pane overlay.
   */
  setScale(instanceId: string, scale: OverlayScale): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.plugin.descriptor.placement !== 'overlay' || instance.config.pane) return false;
    if (scale === 'left') instance.config.scale = 'left';
    else delete instance.config.scale;
    return true;
  }

  renderPanel(
    ctx: CanvasRenderingContext2D,
    instanceId: string,
    viewport: ViewportState,
  ): void {
    this.flush();
    const instance = this.instances.get(instanceId);
    if (!instance?.output || !isShown(instance)) return;
    instance.plugin.render(ctx, instance.output, viewport, instance.style);
  }

  /**
   * Each drawn line's value at the latest bar, in the colour it has there:
   * the tags on the value axis. Empty while hidden or still warming up.
   */
  getLatestValues(instanceId: string): { value: number; color: string }[] {
    this.flush();
    const instance = this.instances.get(instanceId);
    return instance ? latestValues(instance) : [];
  }

  /** `getLatestValues` of every visible price-pane indicator on one scale. */
  getLatestOverlayValues(scale: OverlayScale = 'right'): { value: number; color: string }[] {
    this.flush();
    const out: { value: number; color: string }[] = [];
    for (const instance of this.instances.values()) {
      if (instance.plugin.descriptor.placement !== 'overlay' || instance.config.pane) continue;
      if ((instance.config.scale === 'left') !== (scale === 'left')) continue;
      out.push(...latestValues(instance));
    }
    return out;
  }

  /** Get config for an active indicator instance */
  getIndicatorConfig(instanceId: string): IndicatorConfig | null {
    return this.instances.get(instanceId)?.config ?? null;
  }

  /** Toggle an indicator's visibility. Returns the new value, or null if not found. */
  setVisible(instanceId: string, visible: boolean): boolean | null {
    const instance = this.instances.get(instanceId);
    if (!instance) return null;
    instance.config.visible = visible;
    return visible;
  }

  isVisible(instanceId: string): boolean {
    return this.instances.get(instanceId)?.config.visible ?? false;
  }

  /** Whether the instance is drawn now: visible, and on the chart's interval. */
  isShown(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    return instance ? isShown(instance) : false;
  }

  /**
   * The chart's interval (`'4h'`, `'100T'`), against which each instance's
   * `intervals` are read. True when that changed what is shown.
   */
  setTimeframe(timeframe: string | null): boolean {
    this.timeframe = timeframe;
    let changed = false;
    for (const instance of this.instances.values()) changed = this.placeOnInterval(instance) || changed;
    return changed;
  }

  /**
   * The exchange's IANA zone, which the indicators that start again each day,
   * week or month count their days in (`config.exchangeTimeZone`); null, UTC
   * itself, or a zone the browser does not know, for UTC's (the config then
   * has none). Not the zone the chart shows, so values stay the same however
   * times are displayed. True when it changed. With `data`, the indicators
   * that count days in it (`readsExchangeTimeZone`) and those that read
   * their lines are computed again before the next read, the others left as
   * they are; without, the caller recomputes.
   */
  setExchangeTimeZone(zone: string | null, data?: DataSeries): boolean {
    // UTC is no zone at all: a crypto feed's symbol switch, UTC to none and
    // back, then changes nothing and computes nothing again.
    const next = zone && !isUtcTimeZone(zone) && isValidTimeZone(zone) ? zone : null;
    if (next === this.exchangeTimeZone) return false;
    this.exchangeTimeZone = next;
    for (const { config } of this.instances.values()) {
      if (next) config.exchangeTimeZone = next;
      else delete config.exchangeTimeZone;
    }
    if (data) {
      const full = this.waitingOn(data).full;
      for (const id of this.zoneDependents()) full.add(id);
    }
    return true;
  }

  /** The instances a change of the exchange's zone moves: those that read it, and those that read their lines. */
  private zoneDependents(): Set<string> {
    const out = new Set<string>();
    for (const instance of this.instances.values()) {
      if (!readsZone(instance.plugin)) continue;
      out.add(instance.config.instanceId);
      for (const id of this.getDependents(instance.config.instanceId)) out.add(id);
    }
    return out;
  }

  /**
   * The intervals the instance shows on (null: all of them), checked as
   * `cleanIntervals` checks them. False when not found.
   */
  setIntervals(instanceId: string, intervals: IndicatorIntervals | null): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    const clean = intervals ? cleanIntervals(intervals) : null;
    if (clean) instance.config.intervals = clean;
    else delete instance.config.intervals;
    this.placeOnInterval(instance);
    return true;
  }

  /** The intervals the instance shows on; null when all of them (or not found). */
  getIntervals(instanceId: string): IndicatorIntervals | null {
    const intervals = this.instances.get(instanceId)?.config.intervals;
    return intervals ? copyIntervals(intervals) : null;
  }

  /**
   * Whether the bars the chart draws carry times of their own. Off for the
   * types that redraw them (Renko bricks, Kagi lines…), whose times only
   * count them: an indicator that reads another symbol by time would read
   * it at the wrong bars there, so it is not shown. True when that changed
   * what is shown.
   */
  setBarsTimed(on: boolean): boolean {
    if (on === this.barsTimed) return false;
    this.barsTimed = on;
    let changed = false;
    for (const instance of this.instances.values()) changed = this.placeOnChartType(instance) || changed;
    return changed;
  }

  /** Mark the instance on or off the chart's type; true when that changed. */
  private placeOnChartType(instance: IndicatorInstance): boolean {
    const off = !this.barsTimed && SYMBOL_INDICATOR_IDS.has(instance.config.id);
    if (off === instance.offChartType) return false;
    instance.offChartType = off;
    return true;
  }

  /** Mark the instance on or off the chart's interval; true when that changed. */
  private placeOnInterval(instance: IndicatorInstance): boolean {
    const off = !shownOnInterval(instance.config.intervals, this.timeframe);
    if (off === instance.offInterval) return false;
    instance.offInterval = off;
    return true;
  }

  /** The instance's reference levels: its own, else its indicator's defaults. */
  getLevels(instanceId: string): number[] {
    const instance = this.instances.get(instanceId);
    if (!instance) return [];
    return [...(instance.config.levels ?? instance.plugin.descriptor.levels ?? [])];
  }

  /**
   * Set the instance's reference levels; `null` goes back to the indicator's
   * defaults. Non-finite values are dropped. Returns false if not found.
   */
  setLevels(instanceId: string, levels: readonly number[] | null): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    if (levels === null) delete instance.config.levels;
    else instance.config.levels = levels.filter((v) => Number.isFinite(v));
    return true;
  }

  /**
   * The value range of a pane indicator over bars `[from, to]`: its drawn
   * values, its levels, zero for histograms and its fixed bounds. Null when
   * there is nothing to fit.
   */
  /**
   * The value range of a pane over bars `[from, to]`, its members included.
   * With `log`, the range for a logarithmic scale: null when any of them has
   * a value at or below zero there (the pane stays linear); a member with
   * nothing visible yet is left out, as on a linear scale.
   */
  getPaneValueRange(instanceId: string, from: number, to: number, log = false): { min: number; max: number } | null {
    this.flush();
    let range: { min: number; max: number } | null = null;
    // The pane's own indicator and those drawn in it share one scale.
    for (const id of [instanceId, ...this.getPaneMembers(instanceId)]) {
      const instance = this.instances.get(id);
      if (!instance || !isShown(instance)) continue;
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

  /** Get descriptor for an active indicator instance */
  getIndicatorDescriptor(instanceId: string): IndicatorDescriptor | null {
    return this.instances.get(instanceId)?.plugin.descriptor ?? null;
  }

  /** List all active indicator instances with their current config */
  getActiveIndicators(): ActiveIndicatorInfo[] {
    const result: ActiveIndicatorInfo[] = [];
    for (const [instanceId, instance] of this.instances) {
      result.push({
        instanceId,
        id: instance.config.id,
        params: { ...instance.config.params },
        descriptor: instance.plugin.descriptor,
        visible: instance.config.visible ?? true,
        shown: isShown(instance),
        ...(instance.offChartType ? { offChartType: true as const } : {}),
        ...(instance.config.intervals ? { intervals: copyIntervals(instance.config.intervals) } : {}),
        ...(instance.config.pane ? { pane: instance.config.pane } : {}),
      });
    }
    return result;
  }

  /** The style the indicator draws with (a copy). */
  getIndicatorStyle(instanceId: string): ResolvedIndicatorStyle | null {
    const style = this.instances.get(instanceId)?.style;
    if (!style) return null;
    return {
      colors: [...style.colors],
      lineWidths: [...style.lineWidths],
      opacity: style.opacity,
      ...(style.plots ? { plots: copyPlots(style.plots) } : {}),
    };
  }

  /**
   * Update indicator style at runtime: colours, widths and opacity as given;
   * each plot's style merged into what it had.
   */
  updateIndicatorStyle(instanceId: string, style: Partial<ResolvedIndicatorStyle>): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    const { plots, ...rest } = style;
    Object.assign(instance.style, rest);
    if (plots) {
      const merged = copyPlots(instance.style.plots ?? {});
      for (const [key, plot] of Object.entries(plots)) merged[key] = { ...merged[key], ...plot };
      instance.style.plots = merged;
    }
  }

  /** Each plot's style in place of what it had (null: none), as a layout or an undo has them. */
  setPlotStyles(instanceId: string, plots: Record<string, IndicatorPlotStyle> | null): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    if (plots && Object.keys(plots).length > 0) instance.style.plots = copyPlots(plots);
    else delete instance.style.plots;
  }

  /**
   * The style indicators of kind `id` start with from now on (null: none of
   * their own). Those already on the chart keep theirs.
   */
  setStyleDefaults(id: string, style: IndicatorStyleConfig | null): void {
    if (style) this.styleDefaults.set(id, { ...style, ...(style.plots ? { plots: copyPlots(style.plots) } : {}) });
    else this.styleDefaults.delete(id);
  }

  /**
   * Compute the min/max of all visible overlay indicator values within a bar
   * index range. Called on every autoScale render (i.e. every pan/zoom
   * frame while any overlay indicator is active) — must stay O(visible
   * range), not O(dataset length). Walks `output.series` (array, indexed by
   * bar position) directly over `[from, to]` instead of iterating the full
   * `output.values` Map and discarding everything outside the range.
   */
  getOverlayPriceRange(from: number, to: number, scale: OverlayScale = 'right'): { min: number; max: number } | null {
    this.flush();
    let gMin = Infinity;
    let gMax = -Infinity;

    for (const instance of this.instances.values()) {
      if (!instance.output || !isShown(instance)) continue;
      if (instance.plugin.descriptor.placement !== 'overlay' || instance.config.pane) continue;
      // Overlays on the left scale have a range of their own.
      if ((instance.config.scale === 'left') !== (scale === 'left')) continue;

      const series = instance.output.series;
      if (!series) continue; // no array form published — nothing to scan safely in range

      // Only what is drawn: a trend flag (±1) or a session key must not
      // stretch the price scale.
      const keys = shownKeys(instance);
      const end = Math.min(to, series.length - 1);
      for (let idx = Math.max(0, from); idx <= end; idx++) {
        const val = series[idx];
        if (!val) continue;
        if (keys) {
          for (let k = 0; k < keys.length; k++) {
            const v = val[keys[k]];
            if (v !== undefined && isFinite(v)) {
              if (v < gMin) gMin = v;
              if (v > gMax) gMax = v;
            }
          }
          continue;
        }
        for (const key in val) {
          const v = val[key];
          if (v !== undefined && isFinite(v)) {
            if (v < gMin) gMin = v;
            if (v > gMax) gMax = v;
          }
        }
      }
    }

    if (gMin === Infinity) return null;
    return { min: gMin, max: gMax };
  }

  getPanelIndicators(): { instanceId: string; descriptor: IndicatorDescriptor }[] {
    const result: { instanceId: string; descriptor: IndicatorDescriptor }[] = [];
    for (const [id, instance] of this.instances) {
      if (instance.plugin.descriptor.placement === 'panel') {
        result.push({ instanceId: id, descriptor: instance.plugin.descriptor });
      }
    }
    return result;
  }
}

/** Whether an instance is drawn: switched on, on the chart's interval, and on its type. */
function isShown(instance: IndicatorInstance): boolean {
  return instance.config.visible !== false && !instance.offInterval && !instance.offChartType;
}

/** The fields an instance draws and shows: a hidden plot stretches no scale. */
function shownKeys(instance: IndicatorInstance): readonly string[] | null {
  const keys = drawnKeys(instance.plugin.descriptor);
  const plots = instance.style.plots;
  return keys && plots ? keys.filter((key) => plots[key]?.visible !== false) : keys;
}

function latestValues(instance: IndicatorInstance): { value: number; color: string }[] {
  const series = instance.output?.series;
  const plots = instance.plugin.descriptor.plots;
  if (!series || !plots || !isShown(instance)) return [];
  const point = series[series.length - 1];
  if (!point) return [];
  const out: { value: number; color: string }[] = [];
  for (const plot of plots) {
    if (!plotShown(plot, instance.style)) continue;
    const v = point[plot.key];
    if (v !== undefined && Number.isFinite(v)) out.push({ value: v, color: plotColor(plot, instance.style, point) });
  }
  return out;
}
