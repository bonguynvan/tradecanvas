import type { PanelPosition, PanelConfig, ResolvedLayout, ResolvedPanel, DividerRect, Rect } from '@tradecanvas/commons';
import { DEFAULT_PANEL_HEIGHT, MIN_PANEL_HEIGHT, PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from '@tradecanvas/commons';

const DEFAULT_PANEL_WIDTH = 200;
const MIN_PANEL_WIDTH = 80;
/** What a folded pane keeps: its header, with the indicator's name and the pane's buttons. */
export const COLLAPSED_PANE_HEIGHT = 20;
/** The least the price pane keeps while a pane is maximised. */
export const MIN_MAIN_HEIGHT_WITH_MAXIMIZED = 48;

const isHorizontal = (p: PanelConfig): boolean => p.position === 'top' || p.position === 'bottom';

export class LayoutManager {
  private panels: PanelConfig[] = [];
  private containerWidth = 0;
  private containerHeight = 0;
  private priceAxisWidth = PRICE_AXIS_WIDTH;
  /** Width of the left price scale; 0 while it is hidden. */
  private leftAxisWidth = 0;
  /** The pane that takes the room of the others (they fold to their headers), or null. */
  private maximized: string | null = null;

  resize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
  }

  addPanel(instanceId: string, position: PanelPosition = 'bottom', size?: number): void {
    // A new pane shows: the maximised layout goes back to normal.
    this.maximized = null;
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
    if (this.maximized === fromId) this.maximized = toId;
  }

  removePanel(instanceId: string): void {
    this.panels = this.panels.filter((p) => p.id !== instanceId);
    if (this.maximized === instanceId) this.maximized = null;
  }

  /**
   * Fold a top or bottom pane to its header, or open it again. While a pane
   * is maximised this puts the layout back to normal first (the other panes
   * show folded then). False when nothing changed.
   */
  setPanelCollapsed(instanceId: string, collapsed: boolean): boolean {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (!panel || !isHorizontal(panel)) return false;
    if (this.maximized === null && !!panel.collapsed === collapsed) return false;
    this.maximized = null;
    panel.collapsed = collapsed || undefined;
    return true;
  }

  /** Folded as set (see `isPanelShownCollapsed` for how it shows). */
  isPanelCollapsed(instanceId: string): boolean {
    return !!this.panels.find((p) => p.id === instanceId)?.collapsed;
  }

  /** Shown folded: folded as set, or another pane is maximised. */
  isPanelShownCollapsed(instanceId: string): boolean {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (!panel || !isHorizontal(panel)) return false;
    return this.maximized !== null ? this.maximized !== instanceId : !!panel.collapsed;
  }

  /** A pane's value scale: logarithmic, upside down. False when nothing changed. */
  setPanelScale(instanceId: string, scale: { log?: boolean; invert?: boolean }): boolean {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (!panel) return false;
    let changed = false;
    if (scale.log !== undefined && !!panel.logScale !== scale.log) {
      panel.logScale = scale.log || undefined;
      changed = true;
    }
    if (scale.invert !== undefined && !!panel.invertScale !== scale.invert) {
      panel.invertScale = scale.invert || undefined;
      changed = true;
    }
    return changed;
  }

  /** Whether `movePanel(instanceId, delta)` would move it. */
  canMovePanel(instanceId: string, delta: -1 | 1): boolean {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (!panel) return false;
    const group = this.panels.filter((p) => p.position === panel.position);
    return group[group.indexOf(panel) + delta] !== undefined;
  }

  /**
   * Let one top or bottom pane take the room: the others fold to their
   * headers and the price pane keeps a strip. `null` puts them back.
   */
  setMaximizedPanel(instanceId: string | null): boolean {
    const panel = instanceId === null ? null : this.panels.find((p) => p.id === instanceId);
    if (instanceId !== null && (!panel || !isHorizontal(panel))) return false;
    if (this.maximized === instanceId) return false;
    this.maximized = instanceId;
    if (panel) panel.collapsed = undefined;
    return true;
  }

  getMaximizedPanel(): string | null {
    return this.maximized;
  }

  /**
   * Move a pane one place up (`-1`) or down (`1`) among the panes on its side
   * of the price pane. False at the end of the line.
   */
  movePanel(instanceId: string, delta: -1 | 1): boolean {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (!panel) return false;
    const group = this.panels.filter((p) => p.position === panel.position);
    const at = group.indexOf(panel);
    const other = group[at + delta];
    if (!other) return false;
    const i = this.panels.indexOf(panel);
    const j = this.panels.indexOf(other);
    const next = [...this.panels];
    next[i] = other;
    next[j] = panel;
    this.panels = next;
    return true;
  }

  /** Put the panes on each side in the order of `ids` (others keep their place after them). */
  orderPanels(ids: readonly string[]): void {
    const rank = (p: PanelConfig) => {
      const at = ids.indexOf(p.id);
      return at < 0 ? ids.length + this.panels.indexOf(p) : at;
    };
    this.panels = [...this.panels].sort((a, b) => rank(a) - rank(b));
  }

  /** A pane's height (or width) on screen: folded, maximised or as set. */
  private shownSize(panel: PanelConfig, maximizedSize: number): number {
    if (!isHorizontal(panel)) return panel.size;
    if (this.maximized) return panel.id === this.maximized ? maximizedSize : COLLAPSED_PANE_HEIGHT;
    return panel.collapsed ? COLLAPSED_PANE_HEIGHT : panel.size;
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
      // Side panes neither fold nor maximise.
      if (isVertical) {
        panel.collapsed = undefined;
        if (this.maximized === instanceId) this.maximized = null;
      }
    }
  }

  /**
   * Resize a pane; a folded pane opens, and a maximised layout goes back to
   * normal. A height is kept within the room there is (a stored layout may ask
   * for more).
   */
  setPanelSize(instanceId: string, size: number): void {
    const panel = this.panels.find((p) => p.id === instanceId);
    if (panel) {
      const room = isHorizontal(panel) ? this.containerHeight - TIME_AXIS_HEIGHT - MIN_MAIN_HEIGHT_WITH_MAXIMIZED : this.containerWidth / 2;
      const capped = room > panel.minSize ? Math.min(size, room) : size;
      panel.size = Math.max(panel.minSize, capped);
      panel.collapsed = undefined;
      this.maximized = null;
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

    // A maximised pane takes what the price pane and the folded panes leave.
    const folded = (topPanels.length + bottomPanels.length - 1) * COLLAPSED_PANE_HEIGHT;
    const maximizedPanel = this.maximized ? this.panels.find((p) => p.id === this.maximized) : undefined;
    const maximizedSize = Math.max(
      maximizedPanel?.minSize ?? 0,
      this.containerHeight - TIME_AXIS_HEIGHT - MIN_MAIN_HEIGHT_WITH_MAXIMIZED - folded,
    );
    const size = (p: PanelConfig) => this.shownSize(p, maximizedSize);

    const leftWidth = leftPanels.reduce((s, p) => s + p.size, 0);
    const rightWidth = rightPanels.reduce((s, p) => s + p.size, 0);
    const topHeight = topPanels.reduce((s, p) => s + size(p), 0);
    const bottomHeight = bottomPanels.reduce((s, p) => s + size(p), 0);

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
      const height = size(panel);
      resolvedPanels.push({
        config: panel,
        rect: { x: plotX, y, width: mainChartRect.width, height },
      });
      dividers.push({
        panelId: panel.id,
        rect: { x: plotX, y: y + height - 2, width: mainChartRect.width, height: 4 },
        orientation: 'horizontal',
      });
      y += height;
    }

    // Bottom panels
    y = mainChartRect.y + mainChartRect.height;
    for (const panel of bottomPanels) {
      const height = size(panel);
      resolvedPanels.push({
        config: panel,
        rect: { x: plotX, y, width: mainChartRect.width, height },
      });
      dividers.push({
        panelId: panel.id,
        rect: { x: plotX, y: y - 2, width: mainChartRect.width, height: 4 },
        orientation: 'horizontal',
      });
      y += height;
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
