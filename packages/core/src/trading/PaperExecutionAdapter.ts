import type {
  ExecutionAdapter,
  ExecutionConfig,
  ExecutionEventType,
  ExecutionListener,
  FillEvent,
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
} from '@tradecanvas/commons';

export interface PaperExecutionOptions {
  /** Mark price used to fill market orders before `setMarkPrice` is called. */
  markPrice?: number;
}

/**
 * Reference in-memory `ExecutionAdapter`: virtual fills, hedging-style
 * positions (one position per filled order), and pending limit/stop orders
 * triggered via `setMarkPrice()`. SL/TP auto-close when the mark crosses them.
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
  private seq = 0;

  constructor(options: PaperExecutionOptions = {}) {
    this.markPrice = options.markPrice ?? 0;
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

  /** Feed the latest traded price; fills triggered limit/stop orders and SL/TP. */
  setMarkPrice(price: number): void {
    this.markPrice = price;
    this.checkPendingOrders();
    this.checkStops();
  }

  getOrders(): TradingOrder[] {
    return [...this.orders];
  }

  getPositions(): TradingPosition[] {
    return [...this.positions];
  }

  async placeOrder(intent: OrderPlaceIntent): Promise<TradingOrder> {
    const order: TradingOrder = {
      id: this.nextId('ord'),
      side: intent.side,
      type: intent.type,
      price: intent.price,
      stopPrice: intent.stopPrice,
      quantity: intent.quantity ?? 1,
      label: intent.type === 'market' ? undefined : labelFor(intent.type),
      draggable: true,
    };

    if (intent.type === 'market') {
      this.fill(order, this.markPrice || intent.price);
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
    this.positions = this.positions.map((p) =>
      p.id === intent.positionId
        ? {
            ...p,
            stopLoss: intent.stopLoss ?? p.stopLoss,
            takeProfit: intent.takeProfit ?? p.takeProfit,
          }
        : p,
    );
    this.emit('positions', this.positions);
  }

  async closePosition(intent: PositionCloseIntent): Promise<void> {
    this.positions = this.positions.filter((p) => p.id !== intent.positionId);
    this.emit('positions', this.positions);
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
    this.orders = this.orders.filter((o) => o.id !== order.id);
    const position: TradingPosition = {
      id: this.nextId('pos'),
      side: order.side,
      entryPrice: price,
      quantity: order.quantity,
    };
    this.positions = [...this.positions, position];

    const fill: FillEvent = {
      orderId: order.id,
      side: order.side,
      price,
      quantity: order.quantity,
      time: Date.now(),
    };
    this.emit('fill', fill);
    this.emit('orders', this.orders);
    this.emit('positions', this.positions);
  }

  private checkPendingOrders(): void {
    const triggered = this.orders.filter((o) => this.isTriggered(o));
    for (const o of triggered) {
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

  private checkStops(): void {
    const survivors: TradingPosition[] = [];
    let changed = false;
    for (const p of this.positions) {
      const hitSL =
        p.stopLoss !== undefined &&
        (p.side === 'buy' ? this.markPrice <= p.stopLoss : this.markPrice >= p.stopLoss);
      const hitTP =
        p.takeProfit !== undefined &&
        (p.side === 'buy' ? this.markPrice >= p.takeProfit : this.markPrice <= p.takeProfit);
      if (hitSL || hitTP) {
        changed = true;
        continue;
      }
      survivors.push(p);
    }
    if (changed) {
      this.positions = survivors;
      this.emit('positions', this.positions);
    }
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
