import type { Rect, ViewportState } from './rendering.js';

export type PanelPosition = 'top' | 'bottom' | 'left' | 'right';

export interface PanelConfig {
  id: string;
  position: PanelPosition;
  size: number;
  minSize: number;
  content: PanelContentConfig;
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
