import type {
  IndicatorPlugin,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorDescriptor,
  ResolvedIndicatorStyle,
  DataSeries,
  ViewportState,
} from '@chart-lib/commons';

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

    const instanceId = `${id}_${nextId++}`;
    const config: IndicatorConfig = {
      id,
      instanceId,
      params: { ...plugin.descriptor.defaultConfig, ...params },
      visible: true,
    };

    const defaultColors = ['#2196F3', '#FF9800', '#4CAF50', '#E91E63', '#9C27B0'];
    const style: ResolvedIndicatorStyle = {
      colors: config.style?.colors ?? defaultColors,
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

  /** Get descriptor for an active indicator instance */
  getIndicatorDescriptor(instanceId: string): IndicatorDescriptor | null {
    return this.instances.get(instanceId)?.plugin.descriptor ?? null;
  }

  /** List all active indicator instances with their current config */
  getActiveIndicators(): { instanceId: string; id: string; params: Record<string, unknown>; descriptor: IndicatorDescriptor }[] {
    const result: { instanceId: string; id: string; params: Record<string, unknown>; descriptor: IndicatorDescriptor }[] = [];
    for (const [instanceId, instance] of this.instances) {
      result.push({
        instanceId,
        id: instance.config.id,
        params: { ...instance.config.params },
        descriptor: instance.plugin.descriptor,
      });
    }
    return result;
  }

  /** Update indicator style (colors, line widths) at runtime */
  updateIndicatorStyle(instanceId: string, style: Partial<ResolvedIndicatorStyle>): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    Object.assign(instance.style, style);
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
