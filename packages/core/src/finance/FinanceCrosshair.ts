export class FinanceCrosshair {
  private pos: { x: number; y: number } | null = null;
  private canvas: HTMLCanvasElement;
  private onUpdate: () => void;

  private handleMove: (e: PointerEvent) => void;
  private handleLeave: () => void;

  constructor(canvas: HTMLCanvasElement, onUpdate: () => void) {
    this.canvas = canvas;
    this.onUpdate = onUpdate;

    this.handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.onUpdate();
    };
    this.handleLeave = () => {
      this.pos = null;
      this.onUpdate();
    };

    canvas.addEventListener('pointermove', this.handleMove);
    canvas.addEventListener('pointerleave', this.handleLeave);
  }

  getPosition(): { x: number; y: number } | null {
    return this.pos;
  }

  isActive(): boolean {
    return this.pos !== null;
  }

  drawCrosshair(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string,
  ): void {
    if (!this.pos) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(this.pos.x, 0);
    ctx.lineTo(this.pos.x, height);
    ctx.stroke();
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, this.pos.y);
    ctx.lineTo(width, this.pos.y);
    ctx.stroke();
    ctx.restore();
  }

  destroy(): void {
    this.canvas.removeEventListener('pointermove', this.handleMove);
    this.canvas.removeEventListener('pointerleave', this.handleLeave);
  }
}
