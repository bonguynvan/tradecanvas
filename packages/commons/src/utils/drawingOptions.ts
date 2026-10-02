import type { DrawingLevel, DrawingOptionDef, DrawingOptionDefs, DrawingOptionValue, DrawingOptions } from '../types/drawing.js';

/** Most levels a drawing keeps; more is a pasted or hand-edited state, not a chart. */
const MAX_LEVELS = 48;
const MAX_TEXT = 2000;

function sanitizeLevels(raw: unknown): DrawingLevel[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const levels: DrawingLevel[] = [];
  for (const item of raw) {
    if (levels.length >= MAX_LEVELS) break;
    if (typeof item !== 'object' || item === null) continue;
    const { value, visible, color } = item as Record<string, unknown>;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    if (visible !== undefined && typeof visible !== 'boolean') continue;
    const level: DrawingLevel = { value, visible: visible ?? true };
    if (typeof color === 'string' && color) level.color = color;
    levels.push(level);
  }
  return levels;
}

/** `raw` as a value for `def`, or undefined when it isn't one. */
function sanitizeValue(def: DrawingOptionDef, raw: unknown): DrawingOptionValue | undefined {
  switch (def.kind) {
    case 'boolean':
      return typeof raw === 'boolean' ? raw : undefined;
    case 'number': {
      if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
      return Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, raw));
    }
    case 'choice':
      return typeof raw === 'string' && def.choices.some((c) => c.value === raw) ? raw : undefined;
    case 'levels':
      return sanitizeLevels(raw);
    case 'text':
      return typeof raw === 'string' ? raw.slice(0, MAX_TEXT) : undefined;
  }
}

/** The valid entries of `raw` for a tool's options: unknown keys and wrong values are dropped, numbers clamped. */
export function sanitizeDrawingOptions(defs: DrawingOptionDefs | undefined, raw: unknown): DrawingOptions {
  if (!defs || typeof raw !== 'object' || raw === null) return {};
  const out: DrawingOptions = {};
  for (const [key, value] of Object.entries(raw)) {
    const def = defs[key];
    if (!def) continue;
    const clean = sanitizeValue(def, value);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

function copyValue(value: DrawingOptionValue | readonly DrawingLevel[]): DrawingOptionValue {
  return Array.isArray(value) ? value.map((level) => ({ ...level })) : (value as DrawingOptionValue);
}

/** One option of a drawing: its own value when valid, else the tool's default. */
export function drawingOption<T extends DrawingOptionValue = DrawingOptionValue>(
  defs: DrawingOptionDefs | undefined,
  options: DrawingOptions | undefined,
  key: string,
): T {
  const def = defs?.[key];
  if (!def) return options?.[key] as T;
  const own = options && key in options ? sanitizeValue(def, options[key]) : undefined;
  return copyValue(own ?? def.default) as T;
}

/** Every option of a tool for a drawing, defaults filled in. */
export function resolveDrawingOptions(defs: DrawingOptionDefs | undefined, options: DrawingOptions | undefined): DrawingOptions {
  const out: DrawingOptions = {};
  for (const key of Object.keys(defs ?? {})) out[key] = drawingOption(defs, options, key);
  return out;
}
