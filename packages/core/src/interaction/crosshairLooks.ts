import { crosshairTagLook, type ResolvedChartStyle, type ResolvedLineLook, type Theme } from '@tradecanvas/commons';

/**
 * The crosshair's looks: the resolved style's, or the theme's (its crosshair
 * colour, solid, 1 px; tags the text colour faded into the background).
 */
export function crosshairLooks(theme: Theme): ResolvedChartStyle['crosshair'] {
  if (theme.style) return theme.style.crosshair;
  const line = (): ResolvedLineLook => ({ visible: true, color: theme.crosshair, style: 'solid', width: 1 });
  const tag = crosshairTagLook(theme.background, theme.text);
  return { horizontal: line(), vertical: line(), labelBackground: tag.background, labelText: tag.text };
}
