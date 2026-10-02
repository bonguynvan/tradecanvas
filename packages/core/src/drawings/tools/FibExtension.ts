import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { LEVEL_LABEL_OPTIONS, extendOptions, levelList } from './options.js';
import { hitPriceLevels, renderPriceLevels, type PriceLevel } from './priceLevels.js';

export const EXTENSION_LEVELS = levelList([0, 0.618, 1, 1.618, 2, 2.618, 3.618, 4.236], [0.382, 0.5, 0.786, 1.272, 1.414]);

/**
 * Trend-based Fibonacci extension: the A→B move, measured from C in the
 * direction of the trend. Level 1 is C plus the full A→B move.
 */
export class FibExtensionTool extends DrawingBase {
  descriptor = {
    type: 'fibExtension' as const,
    name: 'Fibonacci Extension',
    requiredAnchors: 3,
    fill: true,
    options: {
      levels: { kind: 'levels' as const, label: 'Levels', default: EXTENSION_LEVELS },
      ...extendOptions(true, true),
      ...LEVEL_LABEL_OPTIONS,
      background: { kind: 'boolean' as const, label: 'Background', default: false },
    },
  };

  private levels(state: DrawingState): PriceLevel[] {
    const move = state.anchors[1].price - state.anchors[0].price;
    const c = state.anchors[2].price;
    return this.visibleLevels(state).map((level) => ({ level, price: c + move * level.value }));
  }

  private span(state: DrawingState, viewport: ViewportState): [number, number] {
    const { chartRect } = viewport;
    const xs = state.anchors.map((a) => this.anchorToPixel(a, viewport).x);
    return [
      this.option<boolean>(state, 'extendLeft') ? chartRect.x : Math.min(...xs),
      this.option<boolean>(state, 'extendRight') ? chartRect.x + chartRect.width : Math.max(...xs),
    ];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 3) {
      if (state.anchors.length === 2) {
        const p1 = this.anchorToPixel(state.anchors[0], viewport);
        const p2 = this.anchorToPixel(state.anchors[1], viewport);
        this.applyLineStyle(ctx, state.style);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        this.resetLineStyle(ctx);
      }
      return;
    }
    const [x0, x1] = this.span(state, viewport);
    renderPriceLevels(ctx, state, viewport, this.levels(state), {
      x0,
      x1,
      showLevels: this.option(state, 'showLevels'),
      showPrices: this.option(state, 'showPrices'),
      labelPosition: this.option(state, 'labelPosition'),
      background: this.option(state, 'background'),
    }, (color) => this.applyLineStyle(ctx, { ...state.style, color }));
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 3) return false;
    const [x0, x1] = this.span(state, viewport);
    return hitPriceLevels(point, viewport, this.levels(state), x0, x1, tolerance);
  }
}
