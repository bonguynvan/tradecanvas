import type { PointerReach } from '../interaction/pointerReach.js';
import type {
  TradingOrder,
  TradingPosition,
  DepthData,
  TradingConfig,
  ViewportState,
  Theme,
  Point,
  FillEvent,
} from '@tradecanvas/commons';
import { DARK_THEME, DEFAULT_TRADING_CONFIG, priceTagText } from '@tradecanvas/commons';
import { inPlot } from './plot.js';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';
import { OrderRenderer } from './OrderRenderer.js';
import { PositionRenderer } from './PositionRenderer.js';
import { DepthOverlay } from './DepthOverlay.js';
import { TradingDragHandler } from './TradingDragHandler.js';
import { TradingContextMenu } from './TradingContextMenu.js';
import { BracketTool, bracketRiskReward } from './BracketTool.js';
import { OrderDraftTool } from './OrderDraftTool.js';
import { buttonAt, sameLineAction, type LineButton, type LineButtonAction } from './lineButtons.js';
import { renderFillMarks } from './fillMarks.js';
import { drawAxisBadge, drawTags, spreadAxisBadges, tagAt, type AxisBadge, type TagBox } from './tradingTags.js';
import { clampToPlot } from './plot.js';

/** Most fills kept for their marks; the oldest go first. */
const MAX_FILLS = 1000;
import type { OrderSide } from '@tradecanvas/commons';
import { tradingConfigFor } from '../style/overlayColors.js';

export class TradingManager {
  private orders: TradingOrder[] = [];
  private positions: TradingPosition[] = [];
  private depthData: DepthData | null = null;
  private currentPrice: number | null = null;
  private config: TradingConfig;

  private orderRenderer = new OrderRenderer();
  private positionRenderer = new PositionRenderer();
  private depthOverlay = new DepthOverlay();
  private dragHandler: TradingDragHandler;
  private contextMenu = new TradingContextMenu();
  private bracket = new BracketTool();
  private orderDraft = new OrderDraftTool();
  /** The buttons on the lines as last drawn, for clicks and the cursor. */
  private buttons: LineButton[] = [];
  /** The tags that take their line when pressed, as last drawn. */
  private tagBoxes: TagBox[] = [];
  /** A press on a tag drags its line: how far the line sits from the pointer. */
  private grabOffset = 0;
  private fills: FillEvent[] = [];
  private realisedPnl = 0;

  private requestRender: (() => void) | null = null;
  private eventCallback: ((event: string, data: unknown) => void) | null = null;
  private container: HTMLElement | null = null;

  constructor(config?: Partial<TradingConfig>) {
    this.config = { ...DEFAULT_TRADING_CONFIG, ...config };
    this.dragHandler = new TradingDragHandler(this.config.dragThreshold);

    this.contextMenu.onItemSelect = (intent) => {
      this.eventCallback?.('orderPlace', intent);
    };
  }

  setContainer(container: HTMLElement): void {
    this.container = container;
  }

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setEventCallback(cb: (event: string, data: unknown) => void): void {
    this.eventCallback = cb;
  }

  // --- State ---

  setOrders(orders: TradingOrder[]): void {
    this.orders = orders;
    this.requestRender?.();
  }

  setPositions(positions: TradingPosition[]): void {
    this.positions = positions;
    this.requestRender?.();
  }

  getOrders(): TradingOrder[] {
    return [...this.orders];
  }

  getPositions(): TradingPosition[] {
    return [...this.positions];
  }

  /** The latest price (`setCurrentPrice`), or null before the first. */
  getCurrentPrice(): number | null {
    return this.currentPrice;
  }

  setDepthData(depth: DepthData | null): void {
    this.depthData = depth;
    this.requestRender?.();
  }

  setCurrentPrice(price: number): void {
    this.currentPrice = price;
    this.requestRender?.();
  }

  setConfig(config: Partial<TradingConfig>): void {
    Object.assign(this.config, config);
    this.requestRender?.();
  }

  // --- Fills ---

  /** Mark a fill on the chart (an execution adapter's `fill`). */
  addFill(fill: FillEvent): void {
    this.fills = [...this.fills.slice(-(MAX_FILLS - 1)), fill];
    this.realisedPnl += fill.pnl ?? 0;
    this.requestRender?.();
  }

  setFills(fills: readonly FillEvent[]): void {
    this.fills = fills.slice(-MAX_FILLS);
    this.realisedPnl = fills.reduce((sum, f) => sum + (f.pnl ?? 0), 0);
    this.requestRender?.();
  }

  /** The P&L the fills realised, all of them (the marks keep only the latest). */
  getRealisedPnl(): number {
    return this.realisedPnl;
  }

  getFills(): FillEvent[] {
    return [...this.fills];
  }

  // --- Buttons on the lines ---

  /** The button pressed: it acts when released over it (dragging off cancels). */
  private armed: LineButtonAction | null = null;

  /** Whether `pos` is over a button on an order or position line. */
  isOverButton(pos: Point): boolean {
    return this.config.enabled && buttonAt(this.buttons, pos) !== null;
  }

  /** A button's intent: cancel an order, close or reverse a position, remove a stop. */
  private runButton(action: LineButtonAction): void {
    switch (action.type) {
      case 'cancelOrder':
        this.eventCallback?.('orderCancel', { orderId: action.orderId });
        break;
      case 'closePosition':
        this.eventCallback?.('positionClose', { positionId: action.positionId });
        break;
      case 'reversePosition':
        this.eventCallback?.('positionReverse', { positionId: action.positionId });
        break;
      case 'removeStop':
        this.eventCallback?.('positionModify', { positionId: action.positionId, [action.which]: null });
        break;
    }
  }

  // --- Bracket placement ---

  /** Begin placing a bracket (entry + SL + TP) at `entry` for `side`. */
  startBracket(side: OrderSide, entry: number): void {
    this.bracket.start(side, entry);
    this.requestRender?.();
  }

  cancelBracket(): void {
    if (!this.bracket.isActive()) return;
    this.bracket.cancel();
    this.requestRender?.();
  }

  /** Emit `bracketPlace` with the current draft and clear it. No-op if inactive. */
  confirmBracket(): boolean {
    const draft = this.bracket.getDraft();
    if (!draft) return false;
    this.eventCallback?.('bracketPlace', {
      side: draft.side,
      entry: draft.entry,
      stopLoss: draft.stopLoss,
      takeProfit: draft.takeProfit,
      riskReward: bracketRiskReward(draft),
    });
    this.bracket.cancel();
    this.requestRender?.();
    return true;
  }

  isBracketActive(): boolean {
    return this.bracket.isActive();
  }

  // --- Single-order placement (drag-to-create) ---

  /** Begin a draggable single-order draft at `price` for `side`. */
  startOrderDraft(side: OrderSide, price: number): void {
    this.orderDraft.start(side, price);
    this.requestRender?.();
  }

  cancelOrderDraft(): void {
    if (!this.orderDraft.isActive()) return;
    this.orderDraft.cancel();
    this.requestRender?.();
  }

  /** Emit `orderPlace` with the drafted order (type inferred vs the market). */
  confirmOrderDraft(): boolean {
    const intent = this.orderDraft.toIntent(this.currentPrice);
    if (!intent) return false;
    this.eventCallback?.('orderPlace', intent);
    this.orderDraft.cancel();
    this.requestRender?.();
    return true;
  }

  isOrderDraftActive(): boolean {
    return this.orderDraft.isActive();
  }

  /** Whether `pos` is over an order line or a position's SL/TP that can be dragged. */
  isOverDraggableLine(pos: Point, viewport: ViewportState, tolerance = 8): boolean {
    if (!this.config.enabled) return false;
    if (tagAt(this.tagBoxes, pos.x, pos.y) && !buttonAt(this.buttons, pos)) return true;
    const near = (price: number | undefined) => {
      if (price === undefined) return false;
      const y = priceToY(price, viewport);
      return inPlot(y, viewport) && Math.abs(pos.y - y) <= tolerance;
    };
    for (const o of this.orders) {
      if (o.draggable !== false && near(o.price)) return true;
    }
    for (const p of this.positions) {
      if (near(p.stopLoss) || near(p.takeProfit)) return true;
    }
    return false;
  }

  // --- Pointer events ---

  /**
   * A press at `pos`. `reach` widens what it takes for a finger: the handles
   * of a bracket or order draft, the lines' buttons, the lines.
   */
  onPointerDown(pos: Point, viewport: ViewportState, reach?: Pick<PointerReach, 'handle' | 'order' | 'button'>): boolean {
    if (!this.config.enabled) return false;
    // A button on a tag acts; anywhere else on a tag takes its own line, whatever line is nearer.
    const button = buttonAt(this.buttons, pos, reach?.button);
    const tag = button ? null : tagAt(this.tagBoxes, pos.x, pos.y);
    if (tag && this.grabTag(tag, pos)) {
      this.requestRender?.();
      return true;
    }
    this.grabOffset = 0;
    // Bracket handles take priority over order/position drags while placing.
    if (this.bracket.isActive() && this.bracket.beginDrag(pos, viewport, reach?.handle)) {
      this.requestRender?.();
      return true;
    }
    if (this.orderDraft.isActive() && this.orderDraft.beginDrag(pos, viewport, reach?.handle)) {
      this.requestRender?.();
      return true;
    }
    // A button on a line before the line itself (an SL line is draggable too).
    if (button) {
      this.armed = button.action;
      return true;
    }
    return this.dragHandler.onPointerDown(pos, this.orders, this.positions, viewport, reach?.order ?? 8);
  }

  /** Start dragging the line `tag` is on, the line keeping its distance from the pointer at `pos`. */
  private grabTag(tag: TagBox, pos: Point): boolean {
    this.grabOffset = tag.lineY - pos.y;
    const grab = tag.grab;
    switch (grab.kind) {
      case 'bracket':
        return this.bracket.beginDragOn(grab.handle);
      case 'draft':
        return this.orderDraft.beginDragOn();
      case 'order': {
        const order = this.orders.find((o) => o.id === grab.orderId);
        return order !== undefined && this.dragHandler.beginOrder(order, tag.lineY);
      }
      case 'stop': {
        const position = this.positions.find((p) => p.id === grab.positionId);
        return position !== undefined && this.dragHandler.beginStop(position, grab.which, tag.lineY);
      }
    }
  }

  onPointerMove(pointer: Point, viewport: ViewportState): boolean {
    if (this.armed) return true;
    // Dragged by its tag, the line keeps its distance from the pointer, and stays on the plot.
    const pos = this.grabOffset === 0 ? pointer : { x: pointer.x, y: clampToPlot(pointer.y + this.grabOffset, viewport) };
    if (this.bracket.isDragging()) {
      const consumed = this.bracket.drag(pos, viewport);
      if (consumed) this.requestRender?.();
      return consumed;
    }
    if (this.orderDraft.isDragging()) {
      const consumed = this.orderDraft.drag(pos, viewport);
      if (consumed) this.requestRender?.();
      return consumed;
    }
    if (!this.dragHandler.isActive()) return false;
    const consumed = this.dragHandler.onPointerMove(pos, viewport);
    if (consumed) this.requestRender?.();
    return consumed;
  }

  /** End a press; `pos` is where it ended (none when the pointer left: a pressed button does nothing). */
  onPointerUp(pos?: Point): boolean {
    this.grabOffset = 0;
    if (this.armed) {
      const action = this.armed;
      this.armed = null;
      const over = pos ? buttonAt(this.buttons, pos) : null;
      if (over && sameLineAction(over.action, action)) this.runButton(action);
      return true;
    }
    if (this.bracket.isDragging()) {
      this.bracket.endDrag();
      this.requestRender?.();
      return true;
    }
    if (this.orderDraft.isDragging()) {
      this.orderDraft.endDrag();
      this.requestRender?.();
      return true;
    }
    const result = this.dragHandler.onPointerUp();
    if (result) {
      if (result.sourceType === 'order') {
        this.eventCallback?.('orderModify', {
          orderId: result.id,
          newPrice: result.newPrice,
          previousPrice: result.previousPrice,
        });
      } else {
        this.eventCallback?.('positionModify', {
          positionId: result.id,
          [result.sourceType]: result.newPrice,
        });
      }
      this.requestRender?.();
      return true;
    }
    return false;
  }

  /**
   * Call the press off (the browser took a touch back, a second finger
   * landed): a dragged line or handle goes back where it was, a pressed
   * button does nothing, and nothing is reported. True when there was one.
   */
  cancelPointer(): boolean {
    this.grabOffset = 0;
    let had = false;
    if (this.armed) {
      this.armed = null;
      had = true;
    }
    if (this.bracket.isDragging()) {
      this.bracket.cancelDrag();
      had = true;
    }
    if (this.orderDraft.isDragging()) {
      this.orderDraft.cancelDrag();
      had = true;
    }
    if (this.dragHandler.cancel()) had = true;
    if (had) this.requestRender?.();
    return had;
  }

  onContextMenu(pos: Point, viewport: ViewportState): boolean {
    if (!this.config.enabled || !this.config.contextMenu?.enabled || !this.container) return false;
    const price = yToPrice(pos.y, viewport);
    this.contextMenu.show(pos, price, this.container, this.config, (p) => priceTagText(p, viewport, this.config.pricePrecision));
    return true;
  }

  // --- Render ---

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.buttons = [];
    this.tagBoxes = [];
    if (!this.config.enabled) return;
    // Lines priced off the plot would otherwise paint over the time axis and
    // the panes below; restored even if a host callback (a label) throws.
    const { chartRect } = viewport;
    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
      ctx.clip();
      this.renderInPlot(ctx, viewport, theme);
    } finally {
      ctx.restore();
    }
  }

  private renderInPlot(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    // The config's colours, with the chart's style keys over them.
    const config = tradingConfigFor(this.config, theme);
    // Depth overlay (back)
    if (this.depthData) {
      this.depthOverlay.render(ctx, this.depthData, viewport, config);
    }

    if (config.fillMarks !== false) renderFillMarks(ctx, this.fills, viewport, config);

    // Every line first, then every tag over them, laid out together so none
    // covers another. The tags laid out first keep the axis end: what is
    // being placed, then positions, then orders.
    const drag = this.dragHandler.getDragState();
    this.positionRenderer.renderLines(ctx, this.positions, this.currentPrice, viewport, config, drag);
    this.orderRenderer.renderLines(ctx, this.orders, viewport, config, drag);
    this.bracket.renderLines(ctx, viewport, theme);
    this.orderDraft.renderLines(ctx, viewport, theme);
    const tags = [
      ...this.bracket.tags(viewport, theme),
      ...this.orderDraft.tags(viewport, theme, this.currentPrice),
      ...this.positionRenderer.tags(this.positions, this.currentPrice, viewport, config, drag),
      ...this.orderRenderer.tags(this.orders, viewport, config, drag),
    ];
    drawTags(ctx, tags, viewport, theme, this.buttons, this.tagBoxes);
  }

  /**
   * Draw position/order price badges on the price axis. Drawn after the
   * price axis so they paint ON TOP of the regular axis labels.
   */
  renderAxisBadges(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.config.enabled) return;
    for (const badge of spreadAxisBadges(this.axisBadges(viewport, theme), viewport)) {
      drawAxisBadge(ctx, badge.at, badge.text, badge.color, viewport, theme);
    }
  }

  /** Every price the lines put on the axis, where their lines are. */
  private axisBadges(viewport: ViewportState, theme: Theme): AxisBadge[] {
    const config = tradingConfigFor(this.config, theme);
    return [
      ...this.positionRenderer.axisBadges(this.positions, viewport, config, this.dragHandler.getDragState()),
      ...this.orderRenderer.axisBadges(this.orders, viewport, config, this.dragHandler.getDragState()),
      ...this.bracket.axisBadges(viewport, theme, this.config.pricePrecision),
      ...this.orderDraft.axisBadges(viewport, theme, this.config.pricePrecision),
    ];
  }

  /**
   * Where the axis badges sit (top to bottom), for the scale to keep clear
   * of. The theme colours them; where they sit is the same in any.
   */
  axisTagYs(viewport: ViewportState, theme: Theme = DARK_THEME): number[] {
    if (!this.config.enabled) return [];
    return spreadAxisBadges(this.axisBadges(viewport, theme), viewport).map((b) => b.at);
  }

  destroy(): void {
    this.contextMenu.destroy();
  }
}
