import type { PanelPosition, PanelConfig, ResolvedLayout, ResolvedPanel, DividerRect, Rect } from '@tradecanvas/commons';
import { DEFAULT_PANEL_HEIGHT, MIN_PANEL_HEIGHT, PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from '@tradecanvas/commons';

const DEFAULT_PANEL_WIDTH = 200;
const MIN_PANEL_WIDTH = 80;

export class LayoutManager {
  private panels: PanelConfig[] = [];
  private containerWidth = 0;
  private containerHeight = 0;
  private priceAxisWidth = PRICE_AXIS_WIDTH;
  /** Width of the left price scale; 0 while it is hidden. */
  private leftAxisWidth = 0;

  resize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
  }

  addPanel(instanceId: string, position: PanelPosition = 'bottom', size?: number): void {
    const isVertical = position === 'left' || position === 'right';
    this.panels.push({
      id: instanceId,
      position,
      size: size ?? (isVertical ? DEFAULT_PANEL_WIDTH : DEFAULT_PANEL_HEIGHT),
      minSize: isVertical ? MIN_PANEL_WIDTH : MIN_PANEL_HEIGHT,
      content: { type: 'indicator', indicatorInstanceId: instanceId },
    });
  }

  /** Hand a pane to another indicator, keeping its place and size. */
  renamePanel(fromId: string, toId: string): void {
    const panel = this.panels.find((p) => p.id === fromId);
    if (!panel) return;
    panel.id = toId;
    panel.content = { ...panel.content, indicatorInstanceId: toId };
  }

  removePanel(instanceId: string): void {
    this.panels = this.panels.filter((p) => p.id !== instanceId);
  }

  setPanelPosition(instanceId: string, position: PanelPosition): void {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (panel) {
      const wasVertical = panel.position === 'left' || panel.position === 'right';
      const isVertical = position === 'left' || position === 'right';
      panel.position = position;
      if (wasVertical !== isVertical) {
        panel.size = isVertical ? DEFAULT_PANEL_WIDTH : DEFAULT_PANEL_HEIGHT;
        panel.minSize = isVertical ? MIN_PANEL_WIDTH : MIN_PANEL_HEIGHT;
      }
    }
  }

  setPanelSize(instanceId: string, size: number): void {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (panel) {
      panel.size = Math.max(panel.minSize, size);
    }
  }

  /** Width reserved for the price axis right of the main chart. */
  setPriceAxisWidth(width: number): void {
    this.priceAxisWidth = width;
  }

  /** Width reserved left of the plot for the left price scale (0 = none). */
  setLeftAxisWidth(width: number): void {
    this.leftAxisWidth = Math.max(0, width);
  }

  getPanels(): PanelConfig[] {
    return this.panels;
  }

  resolve(): ResolvedLayout {
    const leftPanels = this.panels.filter((p) => p.position === 'left');
    const rightPanels = this.panels.filter((p) => p.position === 'right');
    const topPanels = this.panels.filter((p) => p.position === 'top');
    const bottomPanels = this.panels.filter((p) => p.position === 'bottom');

    const leftWidth = leftPanels.reduce((s, p) => s + p.size, 0);
    const rightWidth = rightPanels.reduce((s, p) => s + p.size, 0);
    const topHeight = topPanels.reduce((s, p) => s + p.size, 0);
    const bottomHeight = bottomPanels.reduce((s, p) => s + p.size, 0);

    const plotX = leftWidth + this.leftAxisWidth;
    const mainChartRect: Rect = {
      x: plotX,
      y: topHeight,
      width: Math.max(0, this.containerWidth - plotX - rightWidth - this.priceAxisWidth),
      height: Math.max(0, this.containerHeight - topHeight - bottomHeight - TIME_AXIS_HEIGHT),
    };

    const resolvedPanels: ResolvedPanel[] = [];
    const dividers: DividerRect[] = [];

    // Left panels (stacked vertically)
    let x = 0;
    for (const panel of leftPanels) {
      resolvedPanels.push({
        config: panel,
        rect: { x, y: 0, width: panel.size, height: this.containerHeight - TIME_AXIS_HEIGHT },
      });
      dividers.push({
        panelId: panel.id,
        rect: { x: x + panel.size - 2, y: 0, width: 4, height: this.containerHeight },
        orientation: 'vertical',
      });
      x += panel.size;
    }

    // Top panels (stacked horizontally, full width minus left/right)
    let y = 0;
    for (const panel of topPanels) {
      resolvedPanels.push({
        config: panel,
        rect: { x: plotX, y, width: mainChartRect.width, height: panel.size },
      });
      dividers.push({
        panelId: panel.id,
        rect: { x: plotX, y: y + panel.size - 2, width: mainChartRect.width, height: 4 },
        orientation: 'horizontal',
      });
      y += panel.size;
    }

    // Bottom panels
    y = mainChartRect.y + mainChartRect.height;
    for (const panel of bottomPanels) {
      resolvedPanels.push({
        config: panel,
        rect: { x: plotX, y, width: mainChartRect.width, height: panel.size },
      });
      dividers.push({
        panelId: panel.id,
        rect: { x: plotX, y: y - 2, width: mainChartRect.width, height: 4 },
        orientation: 'horizontal',
      });
      y += panel.size;
    }

    // Right panels
    x = plotX + mainChartRect.width + this.priceAxisWidth;
    for (const panel of rightPanels) {
      resolvedPanels.push({
        config: panel,
        rect: { x, y: 0, width: panel.size, height: this.containerHeight - TIME_AXIS_HEIGHT },
      });
      dividers.push({
        panelId: panel.id,
        rect: { x: x - 2, y: 0, width: 4, height: this.containerHeight },
        orientation: 'vertical',
      });
      x += panel.size;
    }

    return { mainChartRect, panels: resolvedPanels, dividers };
  }

  getMainChartRect(): Rect {
    return this.resolve().mainChartRect;
  }
}
