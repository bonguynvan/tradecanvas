import type { Size } from '@tradecanvas/commons';
import { LayerType } from '@tradecanvas/commons';
import { CanvasLayer } from './CanvasLayer.js';

/**
 * Two stacked canvases: the scene (grid, series, indicators, chart objects,
 * axes) and a top canvas for pointer-tied visuals. A hover repaints only the
 * top one, and the compositor blends two surfaces instead of four.
 */
export class LayerManager {
  private scene: CanvasLayer | null = null;
  private top: CanvasLayer | null = null;

  constructor(private container: HTMLElement) {}

  createLayers(): void {
    // Destroy any existing layers first to prevent duplicates
    this.destroy();
    this.scene = new CanvasLayer(this.container, 0);
    this.top = new CanvasLayer(this.container, 1);
  }

  /** `Hover` → the top canvas; every other type → the scene canvas. */
  getLayer(type: LayerType): CanvasLayer | undefined {
    return (type === LayerType.Hover ? this.top : this.scene) ?? undefined;
  }

  resize(size: Size, dpr: number): void {
    this.scene?.resize(size, dpr);
    this.top?.resize(size, dpr);
  }

  destroy(): void {
    this.scene?.destroy();
    this.top?.destroy();
    this.scene = null;
    this.top = null;
  }
}
