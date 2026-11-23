import type { PointerReach } from '../interaction/pointerReach.js';
import type {
  TradingOrder,
  TradingPosition,
  TradingConfig,
  ViewportState,
  Theme,
  Point,
  FillEvent,
  TakeProfitLevel,
} from '@tradecanvas/commons';
import { DARK_THEME, DEFAULT_TRADING_CONFIG, priceTagText } from '@tradecanvas/commons';
import { inPlot } from './plot.js';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';
import { OrderRenderer, stopOf } from './OrderRenderer.js';
import { PositionRenderer } from './PositionRenderer.js';
import { TradingDragHandler, type DragResult } from './TradingDragHandler.js';
import { TradingContextMenu } from './TradingContextMenu.js';
import { BracketTool, bracketRiskReward, type BracketDraft, type BracketSize } from './BracketTool.js';
import { OrderDraftTool } from './OrderDraftTool.js';
import { buttonAt, sameLineAction, type LineButton, type LineButtonAction } from './lineButtons.js';
import { renderFillMarks } from './fillMarks.js';
import { drawAxisBadge, drawTags, spreadAxisBadges, tagAt, type AxisBadge, type TagBox, type TagRect } from './tradingTags.js';
import { clampToPlot } from './plot.js';
import { onGrid, onGridBeyond, type PriceRounding } from '../viewport/priceGrid.js';
import { stopSide } from './positionStops.js';
import { AXIS_LABEL_HEIGHT } from '../ui/axisValueLabels.js';

/** Most fills kept for their marks; the oldest go first. */
const MAX_FILLS = 1000;
import type { OrderSide } from '@tradecanvas/commons';
import { tradingConfigFor } from '../style/overlayColors.js';

export class TradingManager {
  private orders: TradingOrder[] = [];
  private positions: TradingPosition[] = [];
  private currentPrice: number | null = null;
  private config: TradingConfig;

  private orderRenderer = new OrderRenderer();
  private positionRenderer = new PositionRenderer();
  private dragHandler: TradingDragHandler;
  private contextMenu = new TradingContextMenu();
  private bracket = new BracketTool();
  private orderDraft = new OrderDraftTool();
  /** The buttons on the lines as last drawn, for clicks and the cursor. */
  private buttons: LineButton[] = [];
  /** The tags that take their line when pressed, as last drawn. */
  private tagBoxes: TagBox[] = [];
  /** How far short of the plot's right edge the tags end (`setTagInset`). */
  private tagInset = 0;
  /** Where every tag was drawn last. */
  private drawnTags: TagRect[] = [];
  /** A press on a tag drags its line: how far the line sits from the pointer. */
  private grabOffset = 0;
  /** Whether the line pressed has moved in this press: a click moves none. */
  private lineMoved = false;
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

  /** How a price set by hand is put on the market's grid (see `setPriceRounding`). */
  private round: PriceRounding | null = null;

  /**
   * Put the prices set by hand on the market's grid: an order, a stop, a
   * target or a level dragged, a bracket's and a draft order's lines (where
   * they start too), a stop added from its button, the price the right-click
   * menu places at. `round` gives a price on the grid (a chart's
   * `roundPrice`); null leaves prices as the pointer has them.
   */
  setPriceRounding(round: PriceRounding | null): void {
    this.round = round;
    this.dragHandler.setRound(round);
    this.bracket.setRound(round);
    this.orderDraft.setRound(round);
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
    this.dropStaleOrderDrag();
    this.requestRender?.();
  }

  setPositions(positions: TradingPosition[]): void {
    this.positions = positions;
    this.dropStaleStopDrag();
    this.requestRender?.();
  }

  // --- Shown, and movable by hand ---

  /** The positions, orders and fills are left off the chart: none is drawn, none takes a press. */
  private hidden = false;
  /** Their lines and tags don't move by hand; the buttons on them still act. */
  private locked = false;

  /**
   * Hide or show the positions, the orders and the fill marks. Hidden, none
   * is drawn and none can be pressed; a bracket or an order being placed
   * still shows. They are still kept, and still change as the adapter says.
   */
  setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) this.dragHandler.cancel();
    this.requestRender?.();
  }

  isHidden(): boolean {
    return this.hidden;
  }

  /**
   * Lock or unlock the positions' and orders' lines: locked, neither a line
   * nor its tag is dragged (a stop, a target, an order's price), and a
   * position offers no SL or TP to drag out. Their buttons still act.
   */
  setLocked(locked: boolean): void {
    if (locked === this.locked) return;
    this.locked = locked;
    if (locked) this.dragHandler.cancel();
    this.requestRender?.();
  }

  isLocked(): boolean {
    return this.locked;
  }

  /** The positions as drawn: none while hidden. */
  private shownPositions(): TradingPosition[] {
    return this.hidden ? [] : this.positions;
  }

  /** The orders as drawn: none while hidden. */
  private shownOrders(): TradingOrder[] {
    return this.hidden ? [] : this.orders;
  }

  /**
   * An order being dragged that is gone (it filled, or the broker cancelled
   * it): the drag is called off, so letting go asks the broker to move no
   * order it no longer has.
   */
  private dropStaleOrderDrag(): void {
    const drag = this.dragHandler.getDragState();
    if (!drag || (drag.sourceType !== 'order' && drag.sourceType !== 'orderStop')) return;
    const order = this.orders.find((o) => o.id === drag.orderId);
    // A stop being dragged whose order began to work as a limit: it has no stop to move.
    if (order && (drag.sourceType === 'order' || stopOf(order, null) !== undefined)) return;
    this.dragHandler.cancel();
    this.grabOffset = 0;
    this.lineMoved = false;
  }

  /**
   * A stop or target being dragged whose position is gone, or one being added
   * that the position now has (the broker set it meanwhile): the drag is
   * called off, so letting go sends nothing for it.
   */
  private dropStaleStopDrag(): void {
    const drag = this.dragHandler.getDragState();
    if (!drag || drag.sourceType === 'order' || drag.sourceType === 'orderStop') return;
    const position = this.positions.find((p) => p.id === drag.orderId);
    if (drag.sourceType === 'level') {
      // A level the account took off or moved meanwhile: what is at its place now is not what was pressed.
      if (position && drag.level !== undefined && position.takeProfits?.[drag.level]?.price === drag.startPrice) return;
    } else if (position && !(drag.created && position[drag.sourceType] !== undefined)) return;
    this.dragHandler.cancel();
    this.grabOffset = 0;
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
      case 'trailStop':
        this.eventCallback?.('positionModify', { positionId: action.positionId, trailingStop: action.distance });
        break;
    }
  }

  // --- Bracket placement ---

  /** Begin placing a bracket (entry + SL + TP) at `entry` for `side`, of this `size` (none: it has no quantity). */
  startBracket(side: OrderSide, entry: number, size?: BracketSize): void {
    this.bracket.start(side, entry, size);
    this.requestRender?.();
  }

  /** Size the bracket being placed anew; with none being placed it does nothing. */
  setBracketSize(size: BracketSize | undefined): void {
    if (!this.bracket.isActive()) return;
    this.bracket.setSize(size);
    this.requestRender?.();
  }

  /** The bracket being placed, with the quantity its size gives it now; null with none. */
  getBracket(): BracketDraft | null {
    return this.bracket.getDraft();
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
      ...(draft.quantity === undefined ? {} : { quantity: draft.quantity }),
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
    const intent = this.orderDraft.toIntent(this.marketOnGrid());
    if (!intent) return false;
    this.eventCallback?.('orderPlace', intent);
    this.orderDraft.cancel();
    this.requestRender?.();
    return true;
  }

  isOrderDraftActive(): boolean {
    return this.orderDraft.isActive();
  }

  /** Whether `pos` is over an order line, or a position's SL, TP or take-profit level, that can be dragged. */
  isOverDraggableLine(pos: Point, viewport: ViewportState, tolerance = 8): boolean {
    if (!this.config.enabled) return false;
    const tag = tagAt(this.tagBoxes, pos.x, pos.y);
    // Locked, an order's or a position's tag takes no drag; a bracket or an order being placed still does.
    if (tag && !buttonAt(this.buttons, pos)) return !this.locked || tag.grab.kind === 'bracket' || tag.grab.kind === 'draft';
    const near = (price: number | undefined) => {
      if (price === undefined) return false;
      const y = priceToY(price, viewport);
      return inPlot(y, viewport) && Math.abs(pos.y - y) <= tolerance;
    };
    if (this.locked) return false;
    for (const o of this.shownOrders()) {
      // An order's line, and a stop-limit's stop.
      if (o.draggable !== false && (near(o.price) || near(stopOf(o, null)))) return true;
    }
    for (const p of this.shownPositions()) {
      if (near(p.stopLoss) || near(p.takeProfit) || p.takeProfits?.some((level) => near(level.price))) return true;
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
    if (button?.action.type === 'addStop') return this.dragOutStop(button.action, pos, viewport);
    if (button) {
      this.armed = button.action;
      return true;
    }
    if (this.locked) return false;
    return this.dragHandler.onPointerDown(pos, this.shownOrders(), this.shownPositions(), viewport, reach?.order ?? 8);
  }

  /**
   * Start dragging out the stop or target an SL or TP button adds, from where
   * it starts: the line keeps its distance from the pointer, as a tag's does.
   */
  private dragOutStop(action: Extract<LineButtonAction, { type: 'addStop' }>, pos: Point, viewport: ViewportState): boolean {
    const position = this.positions.find((p) => p.id === action.positionId);
    if (!position) return false;
    // Where it starts is a price of the market's too, still beyond the entry and the price now: not hit as it is set.
    const way = stopSide(position, action.which);
    const now = this.currentPrice !== null && Number.isFinite(this.currentPrice) ? this.currentPrice : position.entryPrice;
    const bound = way > 0 ? Math.max(position.entryPrice, now) : Math.min(position.entryPrice, now);
    const price = onGridBeyond(this.round, bound, action.price, way);
    // The drag is measured on the line, as a tag's is: the pointer only moves it.
    const lineY = priceToY(price, viewport);
    if (!this.dragHandler.beginNewStop(position, action.which, price, lineY)) return false;
    this.grabOffset = lineY - pos.y;
    this.requestRender?.();
    return true;
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
        if (this.locked) return false;
        const order = this.orders.find((o) => o.id === grab.orderId);
        return order !== undefined && this.dragHandler.beginOrder(order, tag.lineY);
      }
      case 'orderStop': {
        if (this.locked) return false;
        const order = this.orders.find((o) => o.id === grab.orderId);
        return order !== undefined && this.dragHandler.beginOrderStop(order, tag.lineY);
      }
      case 'stop': {
        if (this.locked) return false;
        const position = this.positions.find((p) => p.id === grab.positionId);
        return position !== undefined && this.dragHandler.beginStop(position, grab.which, tag.lineY);
      }
      case 'level': {
        if (this.locked) return false;
        const position = this.positions.find((p) => p.id === grab.positionId);
        return position !== undefined && this.dragHandler.beginLevel(position, grab.index, tag.lineY);
      }
    }
  }

  /**
   * Whether a line is being dragged to a price: an order's, a position's stop
   * or target, a bracket's or a draft order's. From its first move to the
   * release: a line pressed and not moved is a click, and a button pressed on
   * a line moves none.
   */
  isDraggingLine(): boolean {
    return this.lineMoved && (this.bracket.isDragging() || this.orderDraft.isDragging() || this.dragHandler.isActive());
  }

  onPointerMove(pointer: Point, viewport: ViewportState): boolean {
    if (this.armed) return true;
    // Dragged by its tag, the line keeps its distance from the pointer, and stays on the plot.
    const pos = this.grabOffset === 0 ? pointer : { x: pointer.x, y: clampToPlot(pointer.y + this.grabOffset, viewport) };
    if (this.bracket.isDragging()) {
      const consumed = this.bracket.drag(pos, viewport);
      if (consumed) this.lineMoved = true;
      if (consumed) this.requestRender?.();
      return consumed;
    }
    if (this.orderDraft.isDragging()) {
      const consumed = this.orderDraft.drag(pos, viewport);
      if (consumed) this.lineMoved = true;
      if (consumed) this.requestRender?.();
      return consumed;
    }
    if (!this.dragHandler.isActive()) return false;
    const consumed = this.dragHandler.onPointerMove(pos, viewport);
    // An order's line moves only past the threshold that tells a drag from a click.
    if (this.dragHandler.isDragging()) this.lineMoved = true;
    if (consumed) this.requestRender?.();
    return consumed;
  }

  /** End a press; `pos` is where it ended (none when the pointer left: a pressed button does nothing). */
  onPointerUp(pos?: Point): boolean {
    this.grabOffset = 0;
    this.lineMoved = false;
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
      if (result.sourceType === 'order' || result.sourceType === 'orderStop') {
        const moved = this.orderMove(result);
        if (moved) this.eventCallback?.('orderModify', moved);
      } else if (result.sourceType === 'level') {
        const takeProfits = this.levelsWith(result.id, result.level, result.newPrice);
        if (takeProfits) this.eventCallback?.('positionModify', { positionId: result.id, takeProfits });
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
   * A position's take-profit levels with the one at `index` moved to
   * `price`, the nearest to the entry first, as an account keeps them. Null
   * when it cannot go there: a level is a profit, so one let go at the entry
   * or past it the losing way goes back where it was; and so does one let go
   * at a price of nothing or under it, where an account keeps no level.
   */
  private levelsWith(positionId: string, index: number | undefined, price: number): TakeProfitLevel[] | null {
    const position = this.positions.find((p) => p.id === positionId);
    const levels = position?.takeProfits;
    if (!position || !levels || index === undefined || !levels[index] || !Number.isFinite(price) || !(price > 0)) return null;
    const long = position.side === 'buy';
    if (long ? price <= position.entryPrice : price >= position.entryPrice) return null;
    return levels
      .map((level, i) => (i === index ? { ...level, price } : { ...level }))
      .sort((a, b) => (long ? a.price - b.price : b.price - a.price));
  }

  /**
   * The price now as the market's grid has it: what a draft order's kind is
   * told against. A draft started at the market is on the grid, a step from
   * the price to the digit, and is still an order at the market: a limit.
   */
  private marketOnGrid(): number | null {
    return this.currentPrice === null ? null : onGrid(this.round, this.currentPrice);
  }

  /**
   * What a drag asks of the broker for an order: where it goes, and where a
   * stop-limit's stop goes with it (the room between them kept) or alone.
   * Null for a stop whose order is gone, or has no stop any more.
   */
  private orderMove(result: DragResult): { orderId: string; newPrice: number; previousPrice: number; newStopPrice?: number; previousStopPrice?: number } | null {
    const order = this.orders.find((o) => o.id === result.id);
    const stop = order ? stopOf(order, null) : undefined;
    if (result.sourceType === 'orderStop') {
      if (!order || stop === undefined) return null;
      return { orderId: order.id, newPrice: order.price, previousPrice: order.price, newStopPrice: result.newPrice, previousStopPrice: result.previousPrice };
    }
    const move = { orderId: result.id, newPrice: result.newPrice, previousPrice: result.previousPrice };
    // Taken with the order, the stop lands on the grid of where it is now: the step may change on the way, and a sum leaves dust.
    return stop === undefined ? move : { ...move, newStopPrice: onGrid(this.round, stop + (result.newPrice - result.previousPrice)), previousStopPrice: stop };
  }

  /**
   * Call the press off (the browser took a touch back, a second finger
   * landed): a dragged line or handle goes back where it was, a pressed
   * button does nothing, and nothing is reported. True when there was one.
   */
  cancelPointer(): boolean {
    this.grabOffset = 0;
    this.lineMoved = false;
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
    // Hidden, the orders would be placed out of sight: no menu to place them.
    if (!this.config.enabled || !this.config.contextMenu?.enabled || !this.container || this.hidden) return false;
    const price = onGrid(this.round, yToPrice(pos.y, viewport));
    this.contextMenu.show(pos, price, this.container, this.config, (p) => priceTagText(p, viewport, this.config.pricePrecision));
    return true;
  }

  /** Where the tags were drawn last: what the legend leaves showing. */
  tagRects(): readonly TagRect[] {
    return this.drawnTags;
  }

  /**
   * Keep the tags `px` short of the plot's right edge, clear of a control
   * the chart draws there (the "+" by the price axis); 0 for none.
   */
  setTagInset(px: number): void {
    this.tagInset = Math.max(0, px);
  }

  // --- Render ---

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    this.buttons = [];
    this.tagBoxes = [];
    this.drawnTags = [];
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
    if (config.fillMarks !== false && !this.hidden) renderFillMarks(ctx, this.fills, viewport, config);

    // Every line first, then every tag over them, laid out together so none
    // covers another. The tags laid out first keep the axis end: what is
    // being placed, then positions, then orders.
    const drag = this.dragHandler.getDragState();
    const positions = this.shownPositions();
    const orders = this.shownOrders();
    // Locked, a position offers no stop or target to drag out.
    const positionConfig = this.locked ? { ...config, lineButtons: { ...config.lineButtons, addStops: false } } : config;
    this.positionRenderer.renderLines(ctx, positions, this.currentPrice, viewport, config, drag);
    this.orderRenderer.renderLines(ctx, orders, viewport, config, drag);
    this.bracket.renderLines(ctx, viewport, theme);
    this.orderDraft.renderLines(ctx, viewport, theme);
    const tags = [
      ...this.bracket.tags(viewport, theme),
      ...this.orderDraft.tags(viewport, theme, this.marketOnGrid()),
      ...this.positionRenderer.tags(positions, this.currentPrice, viewport, positionConfig, drag),
      ...this.orderRenderer.tags(orders, viewport, config, drag),
    ];
    drawTags(ctx, tags, viewport, theme, this.buttons, this.tagBoxes, this.tagInset, this.drawnTags);
  }

  /**
   * Draw position/order price badges on the price axis. Drawn after the
   * price axis so they paint ON TOP of the regular axis labels.
   */
  /**
   * The badges, spread among themselves; or, given `at` (one centre per line
   * of `axisBadgeLines`, as the chart placed all of its axis's tags), there.
   */
  renderAxisBadges(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, at?: readonly number[]): void {
    if (!this.config.enabled) return;
    if (at) {
      const { chartRect } = viewport;
      this.sortedAxisBadges(viewport, theme).forEach((badge, i) => {
        const y = at[i] ?? badge.y;
        // One pushed past the plot's edge is left out: it would sit on the time axis.
        if (!Number.isFinite(y) || y - AXIS_LABEL_HEIGHT / 2 < chartRect.y - 0.5 || y + AXIS_LABEL_HEIGHT / 2 > chartRect.y + chartRect.height + 0.5) return;
        drawAxisBadge(ctx, y, badge.text, badge.color, viewport, theme);
      });
      return;
    }
    for (const badge of spreadAxisBadges(this.axisBadges(viewport, theme), viewport)) {
      drawAxisBadge(ctx, badge.at, badge.text, badge.color, viewport, theme);
    }
  }

  /** Where the badges' lines are, top to bottom. */
  axisBadgeLines(viewport: ViewportState, theme: Theme = DARK_THEME): number[] {
    if (!this.config.enabled) return [];
    return this.sortedAxisBadges(viewport, theme).map((b) => b.y);
  }

  private sortedAxisBadges(viewport: ViewportState, theme: Theme): AxisBadge[] {
    return this.axisBadges(viewport, theme).sort((a, b) => a.y - b.y);
  }

  /** Every price the lines put on the axis, where their lines are. */
  private axisBadges(viewport: ViewportState, theme: Theme): AxisBadge[] {
    const config = tradingConfigFor(this.config, theme);
    return [
      ...this.positionRenderer.axisBadges(this.shownPositions(), viewport, config, this.dragHandler.getDragState()),
      ...this.orderRenderer.axisBadges(this.shownOrders(), viewport, config, this.dragHandler.getDragState()),
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
