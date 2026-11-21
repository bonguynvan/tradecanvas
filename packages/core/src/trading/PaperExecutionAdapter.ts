import type {
  ExecutionAdapter,
  ExecutionConfig,
  ExecutionEventType,
  ExecutionListener,
  FillEvent,
  FillReason,
  ConnectionState,
  TradingOrder,
  TradingPosition,
  OrderLabel,
  OrderType,
  OrderPlaceIntent,
  OrderModifyIntent,
  OrderCancelIntent,
  PositionModifyIntent,
  PositionCloseIntent,
  PositionReverseIntent,
} from '@tradecanvas/commons';

export interface PaperExecutionOptions {
  /** Mark price used to fill market orders before `setMarkPrice` is called. */
  markPrice?: number;
  /**
   * How fills become positions. `'hedge'` (the default): each filled order
   * opens a position of its own, a buy beside a sell. `'net'`: there is one
   * position, as on a futures account: a fill the same way adds to it at the
   * average of their prices, a fill the other way takes from it and realises
   * that part, and a larger one turns it round.
   */
  positions?: 'hedge' | 'net';
}

/**
 * `position` with its trailing stop brought to its distance behind `price`
 * (above it, for a short) when that is nearer than where the stop is: a stop
 * only ever tightens. The same position when it does not trail, the price is
 * not known, or the stop stays.
 */
function trailed(position: TradingPosition, price: number): TradingPosition {
  const distance = position.trailingStop;
  if (distance === undefined || !(distance > 0) || !Number.isFinite(price) || !(price > 0)) return position;
  const long = position.side === 'buy';
  const at = long ? price - distance : price + distance;
  const current = position.stopLoss;
  if (current !== undefined && (long ? at <= current : at >= current)) return position;
  return { ...position, stopLoss: at };
}

/**
 * Reference in-memory `ExecutionAdapter`: virtual fills, a position per
 * filled order (or one net position, `positions: 'net'`), and pending
 * limit/stop orders triggered via `setMarkPrice()`. A stop-limit becomes a
 * limit at its stop; of a group where one cancels the others (`ocoGroup`)
 * the first to fill cancels the rest; an order ends at its date (`'gtd'`) or
 * is refused unless it fills at once (`'ioc'`, `'fok'`). SL/TP auto-close
 * when the mark crosses them. Every fill is reported, closes included (with
 * the profit or loss they realise), so a host can keep a trade history.
 *
 * The safe sandbox for demos and tests, and the shape real broker adapters
 * mirror. No network, no real money.
 */
export class PaperExecutionAdapter implements ExecutionAdapter {
  readonly name = 'paper';

  private state: ConnectionState = 'disconnected';
  private listeners = new Map<ExecutionEventType, Set<ExecutionListener>>();
  private orders: TradingOrder[] = [];
  private positions: TradingPosition[] = [];
  private markPrice: number;
  /** The mark's time (ms), when the caller gives one (a replay). */
  private markTime: number | undefined;
  private seq = 0;
  private readonly net: boolean;

  constructor(options: PaperExecutionOptions = {}) {
    this.markPrice = options.markPrice ?? 0;
    this.net = options.positions === 'net';
  }

  connect(_config: ExecutionConfig): void {
    this.state = 'connected';
    this.emit('connectionChange', this.state);
    this.emit('orders', this.orders);
    this.emit('positions', this.positions);
  }

  disconnect(): void {
    this.state = 'disconnected';
    this.emit('connectionChange', this.state);
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Feed the latest traded price, and its time (fills are stamped with it: a
   * replay's fills land on the replayed bars; without one, fills are stamped
   * now); fills triggered limit/stop orders and SL/TP.
   */
  setMarkPrice(price: number, time?: number): void {
    this.markPrice = price;
    this.markTime = time !== undefined && Number.isFinite(time) ? time : undefined;
    this.expireOrders();
    this.checkPendingOrders();
    this.checkStops();
  }

  /** When fills happen: the mark's time when one was given, else now. */
  private fillTime(): number {
    return this.markTime ?? Date.now();
  }

  getOrders(): TradingOrder[] {
    return [...this.orders];
  }

  getPositions(): TradingPosition[] {
    return [...this.positions];
  }

  async placeOrder(intent: OrderPlaceIntent): Promise<TradingOrder> {
    const atOnce = intent.timeInForce === 'ioc' || intent.timeInForce === 'fok';
    if (atOnce && (intent.type === 'stop' || intent.type === 'stopLimit')) {
      throw new Error(`A ${intent.type === 'stop' ? 'stop' : 'stop-limit'} order waits for its stop: it cannot be ${intent.timeInForce}`);
    }
    const dated = intent.timeInForce === 'gtd';
    if (dated && !(intent.expireTime !== undefined && Number.isFinite(intent.expireTime))) {
      throw new Error("A good-till-date order (timeInForce: 'gtd') needs its expireTime");
    }
    const order: TradingOrder = {
      id: this.nextId('ord'),
      side: intent.side,
      type: intent.type,
      price: intent.price,
      stopPrice: intent.stopPrice,
      quantity: intent.quantity ?? 1,
      label: intent.type === 'market' ? undefined : labelFor(intent.type),
      draggable: true,
      stopLoss: intent.stopLoss,
      takeProfit: intent.takeProfit,
      timeInForce: intent.timeInForce,
    };
    // A trail is a distance: anything else asked for is not taken.
    if (intent.trailingStop !== undefined && Number.isFinite(intent.trailingStop) && intent.trailingStop > 0) order.trailingStop = intent.trailingStop;
    if (dated) order.expireTime = intent.expireTime;
    if (intent.ocoGroup) order.ocoGroup = intent.ocoGroup;

    if (intent.type === 'market') {
      this.fill(order, this.markPrice || intent.price);
    } else if (atOnce) {
      // All of it now or none of it: the paper market has no size to fill a part with.
      if (!this.isTriggered(order)) throw new Error(`The ${intent.timeInForce} order was not filled at once: it is cancelled`);
      this.fill(order, order.price);
    } else {
      this.orders = [...this.orders, order];
      this.emit('orders', this.orders);
    }
    return order;
  }

  async modifyOrder(intent: OrderModifyIntent): Promise<void> {
    this.orders = this.orders.map((o) =>
      o.id === intent.orderId ? { ...o, price: intent.newPrice } : o,
    );
    this.emit('orders', this.orders);
  }

  async cancelOrder(intent: OrderCancelIntent): Promise<void> {
    this.orders = this.orders.filter((o) => o.id !== intent.orderId);
    this.emit('orders', this.orders);
  }

  async modifyPosition(intent: PositionModifyIntent): Promise<void> {
    // Left out keeps a stop, null removes it.
    const pick = (next: number | null | undefined, current: number | undefined) =>
      next === undefined ? current : next ?? undefined;
    this.positions = this.positions.map((p) => {
      if (p.id !== intent.positionId) return p;
      const next: TradingPosition = { ...p, stopLoss: pick(intent.stopLoss, p.stopLoss), takeProfit: pick(intent.takeProfit, p.takeProfit) };
      // A distance starts the trail, null ends it; anything that is not a distance is not taken.
      if (intent.trailingStop === null) delete next.trailingStop;
      else if (intent.trailingStop !== undefined && Number.isFinite(intent.trailingStop) && intent.trailingStop > 0) next.trailingStop = intent.trailingStop;
      // The stop taken away: nothing left to trail.
      if (intent.stopLoss === null) delete next.trailingStop;
      // A stop put somewhere by hand stays there, looser than its distance too: it follows on from it.
      return typeof intent.stopLoss === 'number' ? next : trailed(next, this.markPrice);
    });
    this.emit('positions', this.positions);
  }

  async closePosition(intent: PositionCloseIntent): Promise<void> {
    const position = this.positions.find((p) => p.id === intent.positionId);
    if (!position) return;
    this.close(position, this.markPrice || position.entryPrice, 'close');
    this.emit('positions', this.positions);
  }

  /** Close a position at the mark and open the same size the other way. */
  async reversePosition(intent: PositionReverseIntent): Promise<void> {
    const position = this.positions.find((p) => p.id === intent.positionId);
    if (!position) return;
    const price = this.markPrice || position.entryPrice;
    this.close(position, price, 'reverse');
    const quantity = position.quantity - (position.closedQuantity ?? 0);
    const order: TradingOrder = { id: this.nextId('ord'), side: opposite(position.side), type: 'market', price, quantity };
    this.fill(order, price);
  }

  on<T = unknown>(event: ExecutionEventType, listener: ExecutionListener<T>): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as ExecutionListener);
  }

  off<T = unknown>(event: ExecutionEventType, listener: ExecutionListener<T>): void {
    this.listeners.get(event)?.delete(listener as ExecutionListener);
  }

  dispose(): void {
    this.disconnect();
    this.listeners.clear();
    this.orders = [];
    this.positions = [];
  }

  // --- internal ---

  private fill(order: TradingOrder, price: number): void {
    // It is off the book, and so are the orders it cancels: the rest of its group.
    this.orders = this.orders.filter((o) => o.id !== order.id && !(order.ocoGroup !== undefined && o.ocoGroup === order.ocoGroup));
    const fill: FillEvent = {
      orderId: order.id,
      side: order.side,
      price,
      quantity: order.quantity,
      time: this.fillTime(),
      reason: 'order',
    };
    const held = this.net ? this.positions[0] : undefined;
    if (held) this.fillInto(held, order, price, fill);
    else {
      const position = this.opened(order, price, order.quantity);
      this.positions = [...this.positions, position];
      fill.positionId = position.id;
    }
    this.emit('fill', fill);
    this.emit('orders', this.orders);
    this.emit('positions', this.positions);
  }

  /** The position a fill of `quantity` opens, with the order's stops. */
  private opened(order: TradingOrder, price: number, quantity: number): TradingPosition {
    const position: TradingPosition = {
      id: this.nextId('pos'),
      side: order.side,
      entryPrice: price,
      quantity,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
    };
    if (order.trailingStop !== undefined) position.trailingStop = order.trailingStop;
    return position;
  }

  /**
   * A fill on a net account that holds `held`: added to it the same way, at
   * the average of their prices; taken from it the other way, with what that
   * part realised on the fill; and what is left of a larger one opens the
   * other way.
   */
  private fillInto(held: TradingPosition, order: TradingOrder, price: number, fill: FillEvent): void {
    const open = held.quantity - (held.closedQuantity ?? 0);
    if (order.side === held.side) {
      const quantity = open + order.quantity;
      const added: TradingPosition = {
        ...held,
        quantity,
        entryPrice: (held.entryPrice * open + price * order.quantity) / quantity,
        // The fill's stops when it brings them; else the position keeps its own.
        stopLoss: order.stopLoss ?? held.stopLoss,
        takeProfit: order.takeProfit ?? held.takeProfit,
      };
      delete added.closedQuantity;
      if (order.trailingStop !== undefined) added.trailingStop = order.trailingStop;
      this.positions = [added];
      fill.positionId = held.id;
      return;
    }
    const closed = Math.min(open, order.quantity);
    fill.pnl = (price - held.entryPrice) * closed * (held.side === 'buy' ? 1 : -1);
    fill.positionId = held.id;
    if (order.quantity < open) {
      const left: TradingPosition = { ...held, quantity: open - closed };
      delete left.closedQuantity;
      this.positions = [left];
      return;
    }
    this.positions = [];
    if (order.quantity > open) {
      const turned = this.opened(order, price, order.quantity - open);
      this.positions = [turned];
      fill.positionId = turned.id;
    }
  }

  /** Take a position off the book at `price`, reporting the fill and what it realised. */
  private close(position: TradingPosition, price: number, reason: FillReason): void {
    this.positions = this.positions.filter((p) => p.id !== position.id);
    const quantity = position.quantity - (position.closedQuantity ?? 0);
    const direction = position.side === 'buy' ? 1 : -1;
    this.emit('fill', {
      orderId: this.nextId('ord'),
      side: opposite(position.side),
      price,
      quantity,
      time: this.fillTime(),
      positionId: position.id,
      reason,
      pnl: (price - position.entryPrice) * quantity * direction,
    } satisfies FillEvent);
  }

  /** The good-till-date orders whose date the mark's time has reached come off the book. */
  private expireOrders(): void {
    const now = this.markTime;
    if (now === undefined) return;
    const working = this.orders.filter((o) => !(o.timeInForce === 'gtd' && o.expireTime !== undefined && o.expireTime <= now));
    if (working.length === this.orders.length) return;
    this.orders = working;
    this.emit('orders', this.orders);
  }

  private checkPendingOrders(): void {
    // A stop-limit whose stop was reached works on as a limit at its price, and may fill at once.
    const reached = new Set(this.orders.filter((o) => o.type === 'stopLimit' && this.isTriggered(o)).map((o) => o.id));
    if (reached.size > 0) {
      this.orders = this.orders.map((o) => {
        if (!reached.has(o.id)) return o;
        const { stopPrice: _stop, ...rest } = o;
        return { ...rest, type: 'limit', label: 'LIMIT' };
      });
      this.emit('orders', this.orders);
    }
    for (const o of this.orders.filter((o) => this.isTriggered(o))) {
      // One of its group filled before it in this pass, and cancelled it.
      if (!this.orders.includes(o)) continue;
      this.fill(o, o.type === 'limit' ? o.price : o.stopPrice ?? o.price);
    }
  }

  private isTriggered(o: TradingOrder): boolean {
    if (o.type === 'limit') {
      return o.side === 'buy' ? this.markPrice <= o.price : this.markPrice >= o.price;
    }
    if (o.type === 'stop' || o.type === 'stopLimit') {
      const trigger = o.stopPrice ?? o.price;
      return o.side === 'buy' ? this.markPrice >= trigger : this.markPrice <= trigger;
    }
    return false;
  }

  /** Each trailing stop brought up behind the price (down, for a short). True when one moved. */
  private trailStops(): boolean {
    let moved = false;
    this.positions = this.positions.map((p) => {
      const next = trailed(p, this.markPrice);
      if (next !== p) moved = true;
      return next;
    });
    return moved;
  }

  private checkStops(): void {
    // The stops that were there are checked first: a price that falls through one fills it
    // where it was, and only then do the others follow the price.
    let changed = false;
    for (const p of [...this.positions]) {
      const hitSL =
        p.stopLoss !== undefined &&
        (p.side === 'buy' ? this.markPrice <= p.stopLoss : this.markPrice >= p.stopLoss);
      const hitTP =
        p.takeProfit !== undefined &&
        (p.side === 'buy' ? this.markPrice >= p.takeProfit : this.markPrice <= p.takeProfit);
      if (!hitSL && !hitTP) continue;
      // Filled at the stop's price, as a stop order would be.
      this.close(p, hitSL ? p.stopLoss! : p.takeProfit!, hitSL ? 'stopLoss' : 'takeProfit');
      changed = true;
    }
    if (this.trailStops()) changed = true;
    if (changed) this.emit('positions', this.positions);
  }

  private nextId(prefix: string): string {
    return `${prefix}-${++this.seq}`;
  }

  private emit(type: ExecutionEventType, data: unknown): void {
    const set = this.listeners.get(type);
    if (set) {
      const event = { type, data, timestamp: Date.now() };
      for (const listener of set) listener(event);
    }
  }
}

function opposite(side: TradingOrder['side']): TradingOrder['side'] {
  return side === 'buy' ? 'sell' : 'buy';
}

function labelFor(type: OrderType): OrderLabel {
  switch (type) {
    case 'stop':
      return 'STOP';
    case 'stopLimit':
      return 'STOP LIMIT';
    case 'limit':
    default:
      return 'LIMIT';
  }
}
