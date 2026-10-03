import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { LEVEL_LABEL_OPTIONS, extendOptions, fibLevelList } from './options.js';
import { hitPriceLevels, renderPriceLevels, type PriceLevel } from './priceLevels.js';

/** The classic retracement ratios, plus extensions the user can turn on. */
export const RETRACEMENT_LEVELS = fibLevelList([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1], [1.272, 1.414, 1.618, 2.618, 3.618, 4.236]);

/**
 * Fibonacci retracement: level 0 at the first anchor, 1 at the second (the
 * other way round when reversed), each ratio a horizontal line in between or
 * beyond. The lines run across the whole chart unless the extends are off.
 */
export class FibRetracementTool extends DrawingBase {
  descriptor = {
    type: 'fibRetracement' as const,
    name: 'Fibonacci Retracement',
    requiredAnchors: 2,
    fill: true,
    options: {
      levels: { kind: 'levels' as const, label: 'Levels', default: RETRACEMENT_LEVELS },
      ...extendOptions(true, true),
      reverse: { kind: 'boolean' as const, label: 'Reverse', default: false },
      ...LEVEL_LABEL_OPTIONS,
      background: { kind: 'boolean' as const, label: 'Background', default: true },
    },
  };

  private levels(state: DrawingState): PriceLevel[] {
    const reverse = this.option<boolean>(state, 'reverse');
    const from = state.anchors[reverse ? 1 : 0].price;
    const to = state.anchors[reverse ? 0 : 1].price;
    return this.visibleLevels(state).map((level) => ({ level, price: from + (to - from) * level.value }));
  }

  /** Left and right ends of the lines: the anchors, or the chart's edges when extended. */
  private span(state: DrawingState, viewport: ViewportState): [number, number] {
    const { chartRect } = viewport;
    const a = this.anchorToPixel(state.anchors[0], viewport).x;
    const b = this.anchorToPixel(state.anchors[1], viewport).x;
    return [
      this.option<boolean>(state, 'extendLeft') ? chartRect.x : Math.min(a, b),
      this.option<boolean>(state, 'extendRight') ? chartRect.x + chartRect.width : Math.max(a, b),
    ];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
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
    if (state.anchors.length < 2) return false;
    const [x0, x1] = this.span(state, viewport);
    return hitPriceLevels(point, viewport, this.levels(state), x0, x1, tolerance);
  }
}
