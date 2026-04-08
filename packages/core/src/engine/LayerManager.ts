import type { Size } from '@chart-lib/commons';
import { LayerType } from '@chart-lib/commons';
import { CanvasLayer } from './CanvasLayer.js';

export class LayerManager {
  private layers = new Map<LayerType, CanvasLayer>();

  constructor(private container: HTMLElement) {}

  createLayers(): void {
    // Destroy any existing layers first to prevent duplicates
    this.destroy();

    for (const type of [
      LayerType.Background,
      LayerType.Main,
      LayerType.Overlay,
      LayerType.UI,
    ]) {
      this.layers.set(type, new CanvasLayer(this.container, type));
    }
  }

  getLayer(type: LayerType): CanvasLayer | undefined {
    return this.layers.get(type);
  }

  resize(size: Size, dpr: number): void {
    for (const layer of this.layers.values()) {
      layer.resize(size, dpr);
    }
  }

  destroy(): void {
    for (const layer of this.layers.values()) {
      layer.destroy();
    }
    this.layers.clear();
  }
}
