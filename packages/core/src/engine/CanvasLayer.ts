import type { Size } from '@tradecanvas/commons';

/**
 * Keep the page's OpenType features off the chart's text: a canvas, or a
 * tooltip drawn in the chart's font. Chromium draws a canvas's text with the
 * features the element inherits, as the DOM does, and a tag means something
 * else in each face (ss01 is Inter's open digits and IBM Plex's one-storey a),
 * so the chart's text follows only the chart's font. The figures
 * (`font-variant-numeric`) still come through: the widget's tabular figures
 * keep the axes and the legend in columns.
 */
export function isolateFontFeatures(el: HTMLElement): void {
  el.style.fontFeatureSettings = 'normal';
}

export class CanvasLayer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(
    container: HTMLElement,
    zIndex: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = String(zIndex);
    this.canvas.style.pointerEvents = 'none';
    isolateFontFeatures(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);
  }

  resize(size: Size, dpr: number): void {
    this.dpr = dpr;
    const w = Math.round(size.width * dpr);
    const h = Math.round(size.height * dpr);
    // Only resize if dimensions changed (avoids unnecessary canvas clear)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.canvas.style.width = `${size.width}px`;
    this.canvas.style.height = `${size.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(): void {
    // Reset to identity, clear physical pixels, restore DPR transform
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  getSize(): Size {
    return {
      width: this.canvas.width / this.dpr,
      height: this.canvas.height / this.dpr,
    };
  }

  /**
   * Remove the canvas and give its backing store back at once: a canvas
   * waits for garbage collection otherwise, and on a phone the canvases of
   * charts mounted and unmounted add up toward the browser's canvas memory.
   */
  destroy(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.canvas.remove();
  }
}
