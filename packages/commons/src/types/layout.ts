import type { Rect } from './rendering.js';

export type PanelPosition = 'top' | 'bottom' | 'left' | 'right';

export interface PanelConfig {
  id: string;
  position: PanelPosition;
  size: number;
  minSize: number;
  content: PanelContentConfig;
  /** Folded to its header (a top or bottom pane); `size` is kept for when it opens again. */
  collapsed?: boolean;
  /** Its value scale is logarithmic (only while all its values are above 0). */
  logScale?: boolean;
  /** Its value scale runs upside down. */
  invertScale?: boolean;
}

export interface PanelContentConfig {
  type: 'indicator' | 'custom';
  indicatorInstanceId?: string;
}

export interface LayoutConfig {
  panels: PanelConfig[];
}

export interface ResolvedLayout {
  mainChartRect: Rect;
  panels: ResolvedPanel[];
  dividers: DividerRect[];
}

export interface ResolvedPanel {
  config: PanelConfig;
  rect: Rect;
}

export interface DividerRect {
  panelId: string;
  rect: Rect;
  orientation: 'horizontal' | 'vertical';
}
