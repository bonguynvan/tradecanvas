import type { DataSeries, PanelConfig, Rect, ViewportState } from '@tradecanvas/commons';

/** A pane with less plot than this, px, takes no drawings: there is no room to place one. */
export const MIN_DRAWING_PANE_HEIGHT = 24;

const inside = (pos: { x: number; y: number }, r: Rect): boolean =>
  pos.x >= r.x && pos.x <= r.x + r.width && pos.y >= r.y && pos.y <= r.y + r.height;

/**
 * The pane a drawing begun at `pos` goes on: undefined the price pane
 * (whose plot is `priceRect`), an indicator pane's id, null where none
 * takes drawings (an axis, a header, a side or folded pane).
 */
export function drawingPaneAt(
  pos: { x: number; y: number },
  priceRect: Rect,
  panels: readonly Pick<PanelConfig, 'id'>[],
  viewportOf: (paneId: string) => ViewportState | null,
): string | null | undefined {
  if (inside(pos, priceRect)) return undefined;
  for (const panel of panels) {
    const viewport = viewportOf(panel.id);
    if (viewport && inside(pos, viewport.chartRect)) return panel.id;
  }
  return null;
}

/**
 * The viewport a pane's drawings are drawn and read with: its plot under
 * the header, its value scale, the bars' times. Null for a pane that takes
 * none: on a side (its x is not the time), folded, or too short to draw in.
 * `paneViewport` and `data` are read only for a pane that takes them: this
 * runs on every pointer move with a drawing tool, and a stale series is
 * worked out again when read.
 */
export function drawingPaneViewport(
  panel: Pick<PanelConfig, 'position'> | undefined,
  shownCollapsed: boolean,
  paneViewport: () => ViewportState | undefined,
  data: () => DataSeries,
): ViewportState | null {
  if (!panel || (panel.position !== 'top' && panel.position !== 'bottom')) return null;
  if (shownCollapsed) return null;
  const viewport = paneViewport();
  if (!viewport || viewport.chartRect.height < MIN_DRAWING_PANE_HEIGHT) return null;
  return { ...viewport, data: data() };
}

/** Whether pane `paneId` is among `panels` and takes a drawing: no price-only tool goes on a pane. */
export function takesDrawing(panels: readonly Pick<PanelConfig, 'id'>[], paneId: string, priceOnly: boolean): boolean {
  return !priceOnly && panels.some((panel) => panel.id === paneId);
}
