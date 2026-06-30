import type { Point, Rect, ResolvedLayout, PanelPosition } from '@tradecanvas/commons';

interface ResizeState {
  panelId: string;
  position: PanelPosition;
  startSize: number;
  startPos: Point;
}

interface DividerHit {
  panelId: string;
  orientation: 'horizontal' | 'vertical';
  position: PanelPosition;
  size: number;
}

/**
 * Drag a pane divider to resize the adjacent indicator panel. Pure geometry and
 * state — the Chart supplies the current resolved layout and applies the new
 * size. Hovering a divider yields a resize cursor.
 */
export class PaneResizeHandler {
  private state: ResizeState | null = null;
  private layoutGetter: (() => ResolvedLayout) | null = null;
  private onResize: ((panelId: string, size: number) => void) | null = null;

  constructor(private readonly tolerance = 4) {}

  configure(
    layoutGetter: () => ResolvedLayout,
    onResize: (panelId: string, size: number) => void,
  ): void {
    this.layoutGetter = layoutGetter;
    this.onResize = onResize;
  }

  /** The divider hit at `pos`, with its panel's position + current size, or null. Pure. */
  hitTest(pos: Point, layout: ResolvedLayout): DividerHit | null {
    for (const d of layout.dividers) {
      if (within(pos, d.rect, this.tolerance)) {
        const panel = layout.panels.find((p) => p.config.id === d.panelId);
        if (panel) {
          return {
            panelId: d.panelId,
            orientation: d.orientation,
            position: panel.config.position,
            size: panel.config.size,
          };
        }
      }
    }
    return null;
  }

  /** The resize cursor for a divider under `pos`, or null. */
  cursorAt(pos: Point): string | null {
    const layout = this.layoutGetter?.();
    if (!layout) return null;
    const hit = this.hitTest(pos, layout);
    if (!hit) return null;
    return hit.orientation === 'horizontal' ? 'ns-resize' : 'ew-resize';
  }

  /** Begin a resize if `pos` is on a divider. Returns true if the drag started. */
  tryBegin(pos: Point): boolean {
    const layout = this.layoutGetter?.();
    if (!layout) return false;
    const hit = this.hitTest(pos, layout);
    if (!hit) return false;
    this.state = {
      panelId: hit.panelId,
      position: hit.position,
      startSize: hit.size,
      startPos: pos,
    };
    return true;
  }

  move(pos: Point): void {
    const next = this.computeSize(pos);
    if (next) this.onResize?.(next.panelId, next.size);
  }

  /** The new size for the active drag at `pos`, or null. Pure (clamping is the Chart's job). */
  computeSize(pos: Point): { panelId: string; size: number } | null {
    const s = this.state;
    if (!s) return null;
    let delta = 0;
    switch (s.position) {
      case 'bottom':
        delta = s.startPos.y - pos.y; // drag up grows
        break;
      case 'top':
        delta = pos.y - s.startPos.y; // drag down grows
        break;
      case 'left':
        delta = pos.x - s.startPos.x; // drag right grows
        break;
      case 'right':
        delta = s.startPos.x - pos.x; // drag left grows
        break;
    }
    return { panelId: s.panelId, size: s.startSize + delta };
  }

  end(): void {
    this.state = null;
  }

  isActive(): boolean {
    return this.state !== null;
  }
}

function within(pos: Point, rect: Rect, tol: number): boolean {
  return (
    pos.x >= rect.x - tol &&
    pos.x <= rect.x + rect.width + tol &&
    pos.y >= rect.y - tol &&
    pos.y <= rect.y + rect.height + tol
  );
}
