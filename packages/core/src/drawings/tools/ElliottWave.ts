import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, nearPolyline } from '../DrawingBase.js';

/** How a wave degree writes its labels: ① Ⓐ, (1) (A), 1 A, or i a. */
export type WaveDegree = 'primary' | 'intermediate' | 'minor' | 'minute';

const ROMAN = ['0', 'i', 'ii', 'iii', 'iv', 'v'];

/** A wave label (a digit 0–5 or a capital letter) as `degree` writes it. */
export function waveLabel(label: string, degree: WaveDegree): string {
  const digit = /^[0-9]$/.test(label);
  switch (degree) {
    case 'primary':
      if (digit) return label === '0' ? '⓪' : String.fromCodePoint(0x2460 + Number(label) - 1);
      return /^[A-Z]$/.test(label) ? String.fromCodePoint(0x24b6 + label.charCodeAt(0) - 65) : label;
    case 'intermediate':
      return `(${label})`;
    case 'minute':
      return digit ? ROMAN[Number(label)] ?? label : label.toLowerCase();
    default:
      return label;
  }
}

const DEGREE_OPTION = {
  degree: {
    kind: 'choice' as const,
    label: 'Degree',
    default: 'minor',
    choices: [
      { value: 'primary', label: 'Primary' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'minor', label: 'Minor' },
      { value: 'minute', label: 'Minute' },
    ],
  },
};

/**
 * A wave count: a line through its turning points, each labelled above a
 * high or below a low, in the style of the wave degree.
 */
abstract class WaveTool extends DrawingBase {
  protected abstract readonly labels: readonly string[];

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    this.resetLineStyle(ctx);

    const degree = this.option<string>(state, 'degree') as WaveDegree;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = state.style.color;
    ctx.textAlign = 'center';
    for (let i = 0; i < pts.length && i < this.labels.length; i++) {
      const prev = pts[i - 1] ?? pts[i + 1];
      const next = pts[i + 1] ?? pts[i - 1];
      const high = pts[i].y <= Math.min(prev.y, next.y);
      ctx.textBaseline = high ? 'bottom' : 'top';
      ctx.fillText(waveLabel(this.labels[i], degree), pts[i].x, pts[i].y + (high ? -6 : 6));
    }
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    return nearPolyline(point, state.anchors.map((a) => this.anchorToPixel(a, viewport)), tolerance);
  }
}

/** A full cycle: five waves up and three down (1–5, A–C). */
export class ElliottWaveTool extends WaveTool {
  descriptor = { type: 'elliottWave' as const, name: 'Elliott Wave', requiredAnchors: 8, options: DEGREE_OPTION };
  protected readonly labels = ['1', '2', '3', '4', '5', 'A', 'B', 'C'];
}

/** Impulse wave: from its start through waves 1 to 5. */
export class ElliottImpulseTool extends WaveTool {
  descriptor = { type: 'elliottImpulse' as const, name: 'Elliott Impulse Wave', requiredAnchors: 6, options: DEGREE_OPTION };
  protected readonly labels = ['0', '1', '2', '3', '4', '5'];
}

/** Correction: A, B, C. */
export class ElliottCorrectionTool extends WaveTool {
  descriptor = { type: 'elliottCorrection' as const, name: 'Elliott Correction Wave', requiredAnchors: 4, options: DEGREE_OPTION };
  protected readonly labels = ['0', 'A', 'B', 'C'];
}

/** Triangle: A to E. */
export class ElliottTriangleTool extends WaveTool {
  descriptor = { type: 'elliottTriangle' as const, name: 'Elliott Triangle Wave', requiredAnchors: 6, options: DEGREE_OPTION };
  protected readonly labels = ['0', 'A', 'B', 'C', 'D', 'E'];
}

/** Double combination: W, X, Y. */
export class ElliottDoubleComboTool extends WaveTool {
  descriptor = { type: 'elliottDoubleCombo' as const, name: 'Elliott Double Combo Wave', requiredAnchors: 4, options: DEGREE_OPTION };
  protected readonly labels = ['0', 'W', 'X', 'Y'];
}

/** Triple combination: W, X, Y, X, Z. */
export class ElliottTripleComboTool extends WaveTool {
  descriptor = { type: 'elliottTripleCombo' as const, name: 'Elliott Triple Combo Wave', requiredAnchors: 6, options: DEGREE_OPTION };
  protected readonly labels = ['0', 'W', 'X', 'Y', 'X', 'Z'];
}
