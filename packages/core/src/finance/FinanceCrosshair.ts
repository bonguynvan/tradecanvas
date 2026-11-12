export class FinanceCrosshair {
  private pos: { x: number; y: number } | null = null;
  private canvas: HTMLCanvasElement;
  private onUpdate: () => void;

  private handleMove: (e: PointerEvent) => void;
  private handleLeave: (e: PointerEvent) => void;
  private handleOutside: (e: Event) => void;
  private handleCancel: () => void;

  constructor(canvas: HTMLCanvasElement, onUpdate: () => void) {
    this.canvas = canvas;
    this.onUpdate = onUpdate;

    this.handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.onUpdate();
    };
    // A finger leaves when it lifts: what it pointed at stays read out, as a
    // tap's does, until a touch somewhere else. A mouse takes it along.
    this.handleLeave = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      this.clear();
    };
    // By the path the event took: inside a shadow root its target reads as the root's host.
    this.handleOutside = (e: Event) => {
      if (!e.composedPath().includes(canvas)) this.clear();
    };
    // The browser took the touch for its own (a scroll of the page): what it began on is not being pointed at.
    this.handleCancel = () => this.clear();

    canvas.addEventListener('pointermove', this.handleMove);
    // A tap has no move before it.
    canvas.addEventListener('pointerdown', this.handleMove);
    canvas.addEventListener('pointerleave', this.handleLeave);
    canvas.addEventListener('pointercancel', this.handleCancel);
    canvas.ownerDocument.addEventListener('pointerdown', this.handleOutside, true);
  }

  private clear(): void {
    if (this.pos === null) return;
    this.pos = null;
    this.onUpdate();
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
    this.canvas.removeEventListener('pointerdown', this.handleMove);
    this.canvas.removeEventListener('pointerleave', this.handleLeave);
    this.canvas.removeEventListener('pointercancel', this.handleCancel);
    this.canvas.ownerDocument.removeEventListener('pointerdown', this.handleOutside, true);
  }
}
