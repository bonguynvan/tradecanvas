import type { ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/** How strongly a zone's box is filled with its colour. */
const FILL_ALPHA = 0.16;
/** The edges are the levels a trader acts on: they read on the chart's ground. */
const EDGE_ALPHA = 0.8;
/** A zone that has ended (a gap filled, a block broken) is history: fainter than one still standing. */
const ENDED_FADE = 0.45;

/** A price zone over bars: from bar `start`, to bar `end` once it has ended, else to the plot's right edge. */
export interface ZoneBox {
  start: number;
  end: number | null;
  top: number;
  bottom: number;
  /** Bullish: the patterns' rising colour (3) and the `bull` plots; else their falling one (4) and `bear`. */
  up: boolean;
}

/**
 * Draws one zone as a box with a line at each of its prices, the
 * shared look of fair value gaps and order blocks. A price whose plot
 * (`bull`/`bullLow`, `bear`/`bearLow`) is hidden loses its line; both
 * hidden, the zone is not drawn. Gives `'past'` when the zone starts right
 * of the plot, so a caller walking zones by their start can stop there.
 */
export function drawZoneBox(ctx: CanvasRenderingContext2D, zone: ZoneBox, viewport: ViewportState, style: ResolvedIndicatorStyle): 'past' | void {
  const { chartRect } = viewport;
  const right = chartRect.x + chartRect.width;
  const half = viewport.barWidth / 2;
  const shown = (key: string) => style.plots?.[key]?.visible !== false;
  const topKey = zone.up ? 'bull' : 'bear';
  const bottomKey = zone.up ? 'bullLow' : 'bearLow';
  // From the first bar's left edge; to the bar that ended it, or the plot's edge while it stands.
  const start = barIndexToX(zone.start, viewport) - half;
  if (start >= right) return 'past';
  if (!shown(topKey) && !shown(bottomKey)) return;
  const ended = zone.end !== null;
  const x0 = Math.max(chartRect.x, start);
  const x1 = ended ? Math.min(right, barIndexToX(zone.end as number, viewport) + half) : right;
  if (x1 <= chartRect.x || x1 <= x0) return;
  // On a scale turned over the zone's top price is the lower edge on screen.
  const yA = priceToY(zone.top, viewport);
  const yB = priceToY(zone.bottom, viewport);
  const yTop = Math.min(yA, yB);
  const yBottom = Math.max(yA, yB);
  if (yBottom < chartRect.y || yTop > chartRect.y + chartRect.height) return;
  const color = style.colors[zone.up ? 3 : 4] ?? style.colors[0];
  const fade = style.opacity * (ended ? ENDED_FADE : 1);
  ctx.fillStyle = color;
  ctx.globalAlpha = FILL_ALPHA * fade;
  ctx.fillRect(x0, yTop, x1 - x0, yBottom - yTop);
  ctx.globalAlpha = EDGE_ALPHA * fade;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (shown(topKey)) {
    ctx.moveTo(x0, Math.round(yA) + 0.5);
    ctx.lineTo(x1, Math.round(yA) + 0.5);
  }
  if (shown(bottomKey)) {
    ctx.moveTo(x0, Math.round(yB) + 0.5);
    ctx.lineTo(x1, Math.round(yB) + 0.5);
  }
  ctx.stroke();
}
