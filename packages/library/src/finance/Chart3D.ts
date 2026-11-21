import type { Chart3DOptions, View3D } from '@tradecanvas/commons';
import { resolveView } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/** Degrees the chart turns for a pixel it is dragged. */
const TURN_PER_PIXEL = 0.4;
/** A press that moves less than this, px, is a click and turns nothing. */
const DRAG_SLOP = 4;

/** What a finger may still do to the page over a chart that turns: scroll it up and down, and pinch it. */
const TOUCH_LEFT_TO_PAGE = 'pan-y pinch-zoom';

/** A press that may turn the chart: where it began and the view it began from, and where the pointer is now. */
interface Turn {
  id: number;
  x: number;
  y: number;
  from: Required<View3D>;
  lastX: number;
  lastY: number;
  moved: boolean;
  touch: boolean;
}

/**
 * A finance chart drawn in a box that a drag turns. A mouse turns it and
 * tilts it; a finger turns it only and leaves the up-and-down drag to the
 * page, so a chart in a page that scrolls does not hold the scroll.
 */
export abstract class Chart3D<O extends Chart3DOptions, L> extends InteractiveChart<O, L> {
  /** The view the options last gave: what a double click goes back to. */
  private home: View3D | undefined;
  private turn: Turn | null = null;
  /** The press that just ended turned the chart: the click the browser sends after it is not one. */
  private turned = false;

  private readonly onPress = (e: PointerEvent) => {
    this.turned = false;
    if (this.options.rotate === false || e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return;
    this.turn = { id: e.pointerId, x: e.clientX, y: e.clientY, from: this.getView(), lastX: e.clientX, lastY: e.clientY, moved: false, touch: e.pointerType === 'touch' };
    try {
      // Held, the pointer still turns the chart when it leaves the canvas.
      this.canvas.setPointerCapture?.(e.pointerId);
    } catch {
      // A pointer already gone cannot be held: the drag follows it over the canvas alone.
    }
  };

  private readonly onDrag = (e: PointerEvent) => {
    const turn = this.turn;
    if (!turn) {
      this.restCursor();
      return;
    }
    if (e.pointerId !== turn.id) return;
    // Let go where the chart could not see it.
    if (e.buttons === 0) {
      this.endTurn();
      return;
    }
    turn.lastX = e.clientX;
    turn.lastY = e.clientY;
    const dx = e.clientX - turn.x;
    const dy = e.clientY - turn.y;
    if (!turn.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
    turn.moved = true;
    this.canvas.style.cursor = 'grabbing';
    // The near side follows the pointer; dragged down, the eye rises over the floor.
    this.turnTo(resolveView({ yaw: turn.from.yaw - dx * TURN_PER_PIXEL, pitch: turn.touch ? turn.from.pitch : turn.from.pitch + dy * TURN_PER_PIXEL }));
  };

  private readonly onRelease = (e: PointerEvent) => {
    if (this.turn && e.pointerId === this.turn.id) this.endTurn();
  };

  private readonly onReset = () => {
    if (this.options.rotate !== false) this.turnTo(resolveView(this.home));
  };

  constructor(container: HTMLElement, options: O) {
    super(container, options);
    this.home = options.view;
    this.canvas.addEventListener('pointerdown', this.onPress);
    this.canvas.addEventListener('pointermove', this.onDrag);
    this.canvas.addEventListener('pointerup', this.onRelease);
    this.canvas.addEventListener('pointercancel', this.onRelease);
    this.canvas.addEventListener('dblclick', this.onReset);
    this.applyRotate();
  }

  /** Calls the click callback for what is at (x, y). */
  protected abstract pick(layout: L, x: number, y: number): void;

  protected clickAt(layout: L, x: number, y: number): void {
    if (this.turned) {
      this.turned = false;
      return;
    }
    this.pick(layout, x, y);
  }

  /** Whether a drag is turning the chart now: nothing is read out under the pointer meanwhile. */
  protected get turning(): boolean {
    return this.turn?.moved === true;
  }

  private turnTo(view: Required<View3D>): void {
    this.options = { ...this.options, view };
    this.requestRender();
    this.options.onViewChange?.(view);
  }

  private endTurn(): void {
    const turn = this.turn;
    if (!turn) return;
    this.turn = null;
    this.turned = turn.moved;
    // What was laid out for a chart that turns is laid out again for one at rest.
    if (turn.moved) this.options = { ...this.options };
    try {
      this.canvas.releasePointerCapture?.(turn.id);
    } catch {
      // It was never held, or is already let go.
    }
    this.restCursor();
    // What is under the pointer is read out again.
    this.requestRender();
  }

  /** The cursor when nothing is being dragged: a hand over a chart that turns, unless it is on something to click. */
  private restCursor(): void {
    if (this.options.rotate !== false && this.canvas.style.cursor !== 'pointer') this.canvas.style.cursor = 'grab';
  }

  private applyRotate(): void {
    const turns = this.options.rotate !== false;
    // A finger's drag up and down stays the page's, and its pinch; across, it is the chart's.
    this.canvas.style.touchAction = turns ? TOUCH_LEFT_TO_PAGE : '';
    // A mouse dragged off the chart would mark the page's text as it went.
    this.canvas.style.userSelect = turns ? 'none' : '';
    this.canvas.style.setProperty('-webkit-user-select', turns ? 'none' : '');
    if (turns) {
      this.restCursor();
      return;
    }
    // Switched off in the middle of a drag: it ends here, and its release is still no click.
    this.endTurn();
    if (this.canvas.style.cursor === 'grab' || this.canvas.style.cursor === 'grabbing') this.canvas.style.cursor = '';
  }

  /** Where the chart is seen from now. */
  getView(): Required<View3D> {
    return resolveView(this.options.view);
  }

  /** Sees the chart from `view`, which a double click then goes back to. */
  setView(view: View3D): void {
    this.setOptions({ view } as Partial<O>);
  }

  setOptions(options: Partial<O>): void {
    if ('view' in options) this.home = options.view;
    super.setOptions(options);
    // A view set in the middle of a drag: the drag goes on from it, where the pointer is now.
    if ('view' in options && this.turn) this.turn = { ...this.turn, x: this.turn.lastX, y: this.turn.lastY, from: this.getView() };
    this.applyRotate();
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPress);
    this.canvas.removeEventListener('pointermove', this.onDrag);
    this.canvas.removeEventListener('pointerup', this.onRelease);
    this.canvas.removeEventListener('pointercancel', this.onRelease);
    this.canvas.removeEventListener('dblclick', this.onReset);
    super.destroy();
  }
}
