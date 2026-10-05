import type { ResolvedChartStyle, ResolvedLineLook, Theme } from '@tradecanvas/commons';

/**
 * The crosshair's looks: the resolved style's, or the theme's (its crosshair
 * colour, dashed, 1 px; labels in the text colour on the background).
 */
export function crosshairLooks(theme: Theme): ResolvedChartStyle['crosshair'] {
  if (theme.style) return theme.style.crosshair;
  const line = (): ResolvedLineLook => ({ visible: true, color: theme.crosshair, style: 'dashed', width: 1 });
  return { horizontal: line(), vertical: line(), labelBackground: theme.text, labelText: theme.background };
}
