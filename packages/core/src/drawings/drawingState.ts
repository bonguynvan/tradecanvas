import type { AnchorPoint, DrawingOptions, DrawingState, DrawingStyle, IndicatorIntervals } from '@tradecanvas/commons';
import { copyIntervals } from '../indicators/palette.js';

/** A change to a drawing: its anchors (as many as it has), style, options, or the intervals it shows on. */
export interface DrawingPatch {
  anchors?: AnchorPoint[];
  style?: Partial<DrawingStyle>;
  options?: DrawingOptions;
  /** Null: every interval. */
  intervals?: IndicatorIntervals | null;
  /** Its own name, trimmed and cut to `MAX_DRAWING_NAME`; null or blank: none, its tool's name. */
  name?: string | null;
}

/**
 * Where `moveDrawing` puts a drawing among the others: drawn on top of all,
 * under all, one step, or at a place in the order (0 is the bottom).
 */
export type DrawingOrderMove = DrawingOrderStep | number;

/** A step in the order: to the top or the bottom, or one up or down. */
export type DrawingOrderStep = 'front' | 'back' | 'forward' | 'backward';

/** Longest name a drawing keeps; a longer one is cut. */
export const MAX_DRAWING_NAME = 80;

/** A drawing's name as kept: trimmed and cut to length; undefined for none. */
export function cleanDrawingName(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined;
  const clean = name.trim().slice(0, MAX_DRAWING_NAME);
  return clean.length > 0 ? clean : undefined;
}

/** Longest group name kept; a longer one is cut. */
export const MAX_GROUP_NAME = 80;

export function cloneOptions(options: DrawingOptions): DrawingOptions {
  const out: DrawingOptions = {};
  for (const [key, value] of Object.entries(options)) {
    out[key] = Array.isArray(value) ? value.map((level) => ({ ...level })) : value;
  }
  return out;
}

/**
 * Shallow clone tailored for DrawingState. Avoids `structuredClone` in hot
 * paths (drag, resize, duplicate) where the well-known shape lets us spread
 * much faster than the structured-clone algorithm.
 */
export function cloneDrawing(d: DrawingState): DrawingState {
  return {
    ...d,
    anchors: d.anchors.map((a) => ({ ...a })),
    style: { ...d.style },
    options: d.options ? cloneOptions(d.options) : undefined,
    intervals: d.intervals ? copyIntervals(d.intervals) : undefined,
    group: d.group ? { ...d.group } : undefined,
    meta: d.meta ? { ...d.meta } : undefined,
  };
}

export function sameOptions(a: DrawingOptions | undefined, b: DrawingOptions | undefined): boolean {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

export function sameAnchors(a: readonly AnchorPoint[], b: readonly AnchorPoint[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].time !== b[i].time || a[i].price !== b[i].price) return false;
  }
  return true;
}

// Ids are numbered per page, shared by every chart on it. Loading drawings
// (a saved layout, say) moves the numbering past theirs, so a new drawing or
// group never takes an id that is already on a chart.
let nextDrawingNumber = 1;
let nextGroupNumber = 1;
const DRAWING_ID = /^tc_drawing_(\d+)$/;
const GROUP_ID = /^tc_group_(\d+)$/;

export function newDrawingId(): string {
  return `tc_drawing_${nextDrawingNumber++}`;
}

/** A new group's id and its number (for a default name). */
export function newGroupId(): { id: string; number: number } {
  const number = nextGroupNumber++;
  return { id: `tc_group_${number}`, number };
}

/** Number new drawings and groups after the ids these drawings use. */
export function reserveIds(drawings: readonly Pick<DrawingState, 'id' | 'group'>[]): void {
  for (const d of drawings) {
    const drawing = DRAWING_ID.exec(d.id);
    if (drawing) nextDrawingNumber = Math.max(nextDrawingNumber, Number(drawing[1]) + 1);
    const group = d.group ? GROUP_ID.exec(d.group.id) : null;
    if (group) nextGroupNumber = Math.max(nextGroupNumber, Number(group[1]) + 1);
  }
}
