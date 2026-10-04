import type { Size } from '@tradecanvas/commons';
import { LayerType } from '@tradecanvas/commons';
import { CanvasLayer } from './CanvasLayer.js';

/**
 * Two stacked canvases: the scene (grid, series, indicators, chart objects,
 * axes) and a top canvas for pointer-tied visuals. A hover repaints only the
 * top one, and the compositor blends two surfaces instead of four.
 *
 * With a GPU renderer attached, its canvas (grid, sessions, bars, volume)
 * goes under the scene, and under that, only while something needs it, a 2D
 * background (watermark, heatmaps, profiles). Every full-size canvas costs a
 * blend per frame, so the background is there only when it has something to
 * show. Both share the scene's z-index and go before it in the document, so
 * the scene and top keep theirs and whatever a page stacks over the chart
 * stays over it.
 */
export class LayerManager {
  private scene: CanvasLayer | null = null;
  private top: CanvasLayer | null = null;
  private back: CanvasLayer | null = null;
  private gpuCanvas: HTMLCanvasElement | null = null;
  private size: Size | null = null;
  private dpr = 1;

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

  /** The 2D canvas under the GPU's, made on first use; null without a GPU. */
  backLayer(): CanvasLayer | null {
    if (!this.gpuCanvas) return null;
    if (!this.back) {
      this.back = new CanvasLayer(this.container, 0);
      this.container.insertBefore(this.back.canvas, this.gpuCanvas);
      if (this.size) this.back.resize(this.size, this.dpr);
    }
    return this.back;
  }

  /** The pixel ratio the canvases were last sized for. */
  getDpr(): number {
    return this.dpr;
  }

  /** Remove the background canvas, if there is one. */
  dropBackLayer(): void {
    this.back?.destroy();
    this.back = null;
  }

  /** Put a GPU canvas under the scene. */
  attachGpu(canvas: HTMLCanvasElement): void {
    this.detachGpu();
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    this.container.insertBefore(canvas, this.scene?.canvas ?? null);
    this.gpuCanvas = canvas;
    if (this.size) this.sizeGpu(this.size, this.dpr);
  }

  /** Take the GPU and background canvases away: back to two. */
  detachGpu(): void {
    this.dropBackLayer();
    this.gpuCanvas?.remove();
    this.gpuCanvas = null;
  }

  resize(size: Size, dpr: number): void {
    this.size = size;
    this.dpr = dpr;
    this.scene?.resize(size, dpr);
    this.top?.resize(size, dpr);
    this.back?.resize(size, dpr);
    this.sizeGpu(size, dpr);
  }

  destroy(): void {
    this.detachGpu();
    this.scene?.destroy();
    this.top?.destroy();
    this.scene = null;
    this.top = null;
  }

  private sizeGpu(size: Size, dpr: number): void {
    const canvas = this.gpuCanvas;
    if (!canvas) return;
    const w = Math.round(size.width * dpr);
    const h = Math.round(size.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  }
}
