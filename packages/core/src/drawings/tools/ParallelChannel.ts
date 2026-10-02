import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { extendOptions } from './options.js';

export class ParallelChannelTool extends DrawingBase {
  descriptor = {
    type: 'parallelChannel' as const,
    name: 'Parallel Channel',
    requiredAnchors: 3,
    fill: true,
    options: {
      ...extendOptions(),
      middleLine: { kind: 'boolean' as const, label: 'Middle line', default: false },
    },
  };

  /** The base line, the parallel through the third anchor, and the line halfway between. */
  private lines(state: DrawingState, viewport: ViewportState) {
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const left = this.option<boolean>(state, 'extendLeft');
    const right = this.option<boolean>(state, 'extendRight');
    const base = this.extendLine(p1, p2, viewport, left, right);
    if (state.anchors.length < 3) return { base, parallel: null, middle: null, corners: null };

    const p3 = this.anchorToPixel(state.anchors[2], viewport);
    // Perpendicular offset from the base line (p1→p2) to the third anchor.
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const dist = (p3.x - p1.x) * nx + (p3.y - p1.y) * ny;
    const shift = (p: Point, k: number): Point => ({ x: p.x + nx * dist * k, y: p.y + ny * dist * k });
    const p1b = shift(p1, 1);
    const p2b = shift(p2, 1);
    return {
      base,
      parallel: this.extendLine(p1b, p2b, viewport, left, right),
      middle: this.option<boolean>(state, 'middleLine')
        ? this.extendLine(shift(p1, 0.5), shift(p2, 0.5), viewport, left, right)
        : null,
      corners: [p1, p2, p2b, p1b] as const,
    };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const { base, parallel, middle, corners } = this.lines(state, viewport);

    this.applyLineStyle(ctx, state.style);
    for (const line of [base, parallel]) {
      if (!line) continue;
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);
      ctx.lineTo(line[1].x, line[1].y);
      ctx.stroke();
    }
    if (middle) {
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(middle[0].x, middle[0].y);
      ctx.lineTo(middle[1].x, middle[1].y);
      ctx.stroke();
    }

    // Fill between the anchors' span.
    if (corners && state.style.fillColor) {
      ctx.fillStyle = state.style.fillColor;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (const p of corners.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
    }
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** The base line, the parallel, and the middle line when drawn. */
  priceAt(state: DrawingState, time: number): number[] | null {
    if (state.anchors.length < 3) return null;
    const [a, b, c] = state.anchors;
    const base = this.linePriceAt(a, b, time, this.option(state, 'extendLeft'), this.option(state, 'extendRight'));
    const throughC = this.linePriceAt(a, b, c.time, true, true);
    if (base === null || throughC === null) return null;
    const offset = c.price - throughC;
    const prices = [base, base + offset];
    if (this.option<boolean>(state, 'middleLine')) prices.push(base + offset / 2);
    return prices;
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const { base, parallel, middle } = this.lines(state, viewport);
    return [base, parallel, middle].some((line) => line !== null && this.distanceToLine(point, line[0], line[1]) <= tolerance);
  }
}
