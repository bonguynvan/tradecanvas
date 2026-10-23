import type { DrawingToolType } from '@tradecanvas/commons';

/** Alt + a letter picks a drawing tool (by key position, so it works on any layout). */
export const TOOL_HOTKEYS: Readonly<Record<string, DrawingToolType>> = {
  KeyT: 'trendLine',
  KeyH: 'horizontalLine',
  KeyJ: 'horizontalRay',
  KeyV: 'verticalLine',
  KeyC: 'crossLine',
  KeyF: 'fibRetracement',
};

/** Each tool's shortcut as its menu writes it ("Alt+T"). */
export function toolShortcuts(): Partial<Record<DrawingToolType, string>> {
  const out: Partial<Record<DrawingToolType, string>> = {};
  for (const [code, tool] of Object.entries(TOOL_HOTKEYS)) out[tool] = `Alt+${code.replace(/^Key/, '')}`;
  return out;
}
