import type { Size } from '@chart-lib/commons';

export class CanvasLayer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(
    private container: HTMLElement,
    private zIndex: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = String(zIndex);
    this.canvas.style.pointerEvents = 'none';
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

  destroy(): void {
    this.canvas.remove();
  }
}
