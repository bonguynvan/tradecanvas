import type { ViewportState, Rect } from '@chart-lib/commons';
import { DEFAULT_PANEL_HEIGHT, MIN_PANEL_HEIGHT, PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from '@chart-lib/commons';

export interface PaneInfo {
  instanceId: string;
  height: number;
  rect: Rect;
}

export class PaneManager {
  private panels: PaneInfo[] = [];
  private containerWidth = 0;
  private containerHeight = 0;

  resize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
    this.recalcLayout();
  }

  addPanel(instanceId: string, height = DEFAULT_PANEL_HEIGHT): void {
    this.panels.push({ instanceId, height, rect: { x: 0, y: 0, width: 0, height: 0 } });
    this.recalcLayout();
  }

  removePanel(instanceId: string): void {
    this.panels = this.panels.filter((p) => p.instanceId !== instanceId);
    this.recalcLayout();
  }

  getPanels(): PaneInfo[] {
    return this.panels;
  }

  getMainChartRect(): Rect {
    const panelTotalHeight = this.panels.reduce((sum, p) => sum + p.height, 0);
    return {
      x: 0,
      y: 0,
      width: this.containerWidth - PRICE_AXIS_WIDTH,
      height: this.containerHeight - TIME_AXIS_HEIGHT - panelTotalHeight,
    };
  }

  createPanelViewport(panel: PaneInfo, mainViewport: ViewportState): ViewportState {
    return {
      ...mainViewport,
      chartRect: panel.rect,
      priceRange: { min: 0, max: 100 },
    };
  }

  private recalcLayout(): void {
    const mainRect = this.getMainChartRect();
    let y = mainRect.y + mainRect.height;
    for (const panel of this.panels) {
      panel.rect = {
        x: 0,
        y,
        width: this.containerWidth - PRICE_AXIS_WIDTH,
        height: panel.height,
      };
      y += panel.height;
    }
  }
}
