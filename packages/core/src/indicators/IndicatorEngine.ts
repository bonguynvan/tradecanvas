import type {
  IndicatorPlugin,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorDescriptor,
  ResolvedIndicatorStyle,
  DataSeries,
  ViewportState,
} from '@tradecanvas/commons';
import { TC_SERIES_COLORS } from '@tradecanvas/commons';
import { drawnKeys, hasHistogram, paneValueRange } from './plots.js';

interface IndicatorInstance {
  plugin: IndicatorPlugin;
  config: IndicatorConfig;
  output: IndicatorOutput | null;
  style: ResolvedIndicatorStyle;
}

let nextId = 1;

export class IndicatorEngine {
  private registry = new Map<string, IndicatorPlugin>();
  private instances = new Map<string, IndicatorInstance>();

  register(plugin: IndicatorPlugin): void {
    this.registry.set(plugin.descriptor.id, plugin);
  }

  getAvailableIndicators(): IndicatorDescriptor[] {
    return Array.from(this.registry.values()).map((p) => p.descriptor);
  }

  addIndicator(
    id: string,
    params: Record<string, number | string | boolean> = {},
    data?: DataSeries,
  ): string {
    const plugin = this.registry.get(id);
    if (!plugin) throw new Error(`Unknown indicator: ${id}`);

    const instanceId = `tc_${id}_${nextId++}`;
    const config: IndicatorConfig = {
      id,
      instanceId,
      params: { ...plugin.descriptor.defaultConfig, ...params } as Record<string, number | string | boolean>,
      visible: true,
    };

    // A second EMA must not look like the first: each further instance of an
    // indicator starts one step along the palette.
    const taken = new Set<string>();
    for (const other of this.instances.values()) if (other.config.id === id) taken.add(other.style.colors[0]);
    let shift = TC_SERIES_COLORS.findIndex((c) => !taken.has(c));
    if (shift < 0) shift = taken.size % TC_SERIES_COLORS.length;
    const style: ResolvedIndicatorStyle = {
      colors: config.style?.colors ?? [...TC_SERIES_COLORS.slice(shift), ...TC_SERIES_COLORS.slice(0, shift)],
      lineWidths: config.style?.lineWidths ?? [1.5],
      opacity: config.style?.opacity ?? 1,
    };

    const instance: IndicatorInstance = { plugin, config, output: null, style };

    if (data) {
      instance.output = plugin.calculate(data, config);
    }

    this.instances.set(instanceId, instance);
    return instanceId;
  }

  removeIndicator(instanceId: string): void {
    this.instances.delete(instanceId);
  }

  updateIndicator(instanceId: string, params: Record<string, number | string | boolean>, data?: DataSeries): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    Object.assign(instance.config.params, params);
    if (data) {
      instance.output = instance.plugin.calculate(data, instance.config);
    }
  }

  recalculateAll(data: DataSeries): void {
    for (const instance of this.instances.values()) {
      instance.output = instance.plugin.calculate(data, instance.config);
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
    for (const instance of this.instances.values()) {
      const prev = instance.output;
      let next: IndicatorOutput | null = null;
      if (prev && instance.plugin.update && from > 0) {
        next = instance.plugin.update(data, instance.config, prev, from);
      }
      instance.output = next ?? instance.plugin.calculate(data, instance.config);
    }
  }

  getOutput(instanceId: string): IndicatorOutput | null {
    return this.instances.get(instanceId)?.output ?? null;
  }

  renderOverlays(ctx: CanvasRenderingContext2D, viewport: ViewportState): void {
    for (const instance of this.instances.values()) {
      if (!instance.output || !instance.config.visible) continue;
      if (instance.plugin.descriptor.placement !== 'overlay') continue;
      instance.plugin.render(ctx, instance.output, viewport, instance.style);
    }
  }

  renderPanel(
    ctx: CanvasRenderingContext2D,
    instanceId: string,
    viewport: ViewportState,
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance?.output || !instance.config.visible) return;
    instance.plugin.render(ctx, instance.output, viewport, instance.style);
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
  getPaneValueRange(instanceId: string, from: number, to: number): { min: number; max: number } | null {
    const instance = this.instances.get(instanceId);
    if (!instance) return null;
    const descriptor = instance.plugin.descriptor;
    return paneValueRange(instance.output, from, to, {
      keys: drawnKeys(descriptor),
      scale: descriptor.scale,
      levels: instance.config.levels ?? descriptor.levels,
      zero: hasHistogram(descriptor.plots),
    });
  }

  /** Get descriptor for an active indicator instance */
  getIndicatorDescriptor(instanceId: string): IndicatorDescriptor | null {
    return this.instances.get(instanceId)?.plugin.descriptor ?? null;
  }

  /** List all active indicator instances with their current config */
  getActiveIndicators(): { instanceId: string; id: string; params: Record<string, unknown>; descriptor: IndicatorDescriptor; visible: boolean }[] {
    const result: { instanceId: string; id: string; params: Record<string, unknown>; descriptor: IndicatorDescriptor; visible: boolean }[] = [];
    for (const [instanceId, instance] of this.instances) {
      result.push({
        instanceId,
        id: instance.config.id,
        params: { ...instance.config.params },
        descriptor: instance.plugin.descriptor,
        visible: instance.config.visible ?? true,
      });
    }
    return result;
  }

  /** The style the indicator draws with (a copy). */
  getIndicatorStyle(instanceId: string): ResolvedIndicatorStyle | null {
    const style = this.instances.get(instanceId)?.style;
    if (!style) return null;
    return { colors: [...style.colors], lineWidths: [...style.lineWidths], opacity: style.opacity };
  }

  /** Update indicator style (colors, line widths) at runtime */
  updateIndicatorStyle(instanceId: string, style: Partial<ResolvedIndicatorStyle>): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    Object.assign(instance.style, style);
  }

  /**
   * Compute the min/max of all visible overlay indicator values within a bar
   * index range. Called on every autoScale render (i.e. every pan/zoom
   * frame while any overlay indicator is active) — must stay O(visible
   * range), not O(dataset length). Walks `output.series` (array, indexed by
   * bar position) directly over `[from, to]` instead of iterating the full
   * `output.values` Map and discarding everything outside the range.
   */
  getOverlayPriceRange(from: number, to: number): { min: number; max: number } | null {
    let gMin = Infinity;
    let gMax = -Infinity;

    for (const instance of this.instances.values()) {
      if (!instance.output || !instance.config.visible) continue;
      if (instance.plugin.descriptor.placement !== 'overlay') continue;

      const series = instance.output.series;
      if (!series) continue; // no array form published — nothing to scan safely in range

      // Only what is drawn: a trend flag (±1) or a session key must not
      // stretch the price scale.
      const keys = drawnKeys(instance.plugin.descriptor);
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
