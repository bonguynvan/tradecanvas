import type { ViewportState, Theme, ResolvedLineLook } from '@tradecanvas/commons';
import { lineDash } from '@tradecanvas/commons';
import { gridLines } from './gridLines.js';

/** The grid's dashes, as its lines are drawn when `dashed`. */
const GRID_DASH = [4, 4];

export class GridRenderer {
  private visible = true;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.visible) return;
    const { chartRect } = viewport;
    const { horizontal, vertical } = gridLines(viewport);
    const looks = gridLooks(theme);
    const h = looks.horizontal;
    const v = looks.vertical;
    // Both ways alike: one path, so a see-through colour isn't laid twice where they cross.
    if (h.visible && v.visible && h.color === v.color && h.style === v.style && h.width === v.width) {
      stroke(ctx, h, () => {
        for (const y of horizontal) {
          const at = onPixel(y, h.width);
          ctx.moveTo(chartRect.x, at);
          ctx.lineTo(chartRect.x + chartRect.width, at);
        }
        for (const x of vertical) {
          const at = onPixel(x, v.width);
          ctx.moveTo(at, chartRect.y);
          ctx.lineTo(at, chartRect.y + chartRect.height);
        }
      });
      ctx.setLineDash([]);
      return;
    }
    if (looks.horizontal.visible && horizontal.length > 0) {
      stroke(ctx, looks.horizontal, () => {
        for (const y of horizontal) {
          const at = onPixel(y, looks.horizontal.width);
          ctx.moveTo(chartRect.x, at);
          ctx.lineTo(chartRect.x + chartRect.width, at);
        }
      });
    }
    if (looks.vertical.visible && vertical.length > 0) {
      stroke(ctx, looks.vertical, () => {
        for (const x of vertical) {
          const at = onPixel(x, looks.vertical.width);
          ctx.moveTo(at, chartRect.y);
          ctx.lineTo(at, chartRect.y + chartRect.height);
        }
      });
    }
    ctx.setLineDash([]);
  }
}

/** The grid's looks each way: the resolved style's, or the theme's grid colour, solid, 1 px. */
export function gridLooks(theme: Theme): { horizontal: ResolvedLineLook; vertical: ResolvedLineLook } {
  const plain: ResolvedLineLook = { visible: true, color: theme.grid, style: 'solid', width: 1 };
  return theme.style?.grid ?? { horizontal: plain, vertical: plain };
}

/**
 * Whether the GPU can draw the grid as it looks: every way shown is solid,
 * 1 px, and they share a colour. Otherwise the grid goes on Canvas 2D.
 */
export function gridFitsGpu(theme: Theme): boolean {
  const { horizontal, vertical } = gridLooks(theme);
  const shown = [horizontal, vertical].filter((look) => look.visible);
  return shown.every((look) => look.style === 'solid' && look.width === 1 && look.color === shown[0].color);
}

/** One path per way: a single stroke call for all its lines. */
function stroke(ctx: CanvasRenderingContext2D, look: ResolvedLineLook, path: () => void): void {
  ctx.strokeStyle = look.color;
  ctx.lineWidth = look.width;
  ctx.setLineDash(lineDash(look.style, GRID_DASH, look.width));
  ctx.beginPath();
  path();
  ctx.stroke();
}

/** Grid lines come on the half pixel (crisp at 1 px); an even width is crisp on the whole pixel. */
function onPixel(at: number, width: number): number {
  return width % 2 === 0 ? Math.round(at) : at;
}
