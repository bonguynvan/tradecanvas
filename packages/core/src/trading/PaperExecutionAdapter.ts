import type {
  AccountSummary,
  ExecutionAdapter,
  ExecutionConfig,
  ExecutionEventType,
  ExecutionListener,
  FillEvent,
  FillReason,
  MarginCall,
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
  TakeProfitLevel,
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
  /**
   * The cash the account starts with. With it the account keeps its money
   * (`getAccount()`, the `account` event): closes move the balance, open
   * positions hold margin, and an order the free margin cannot carry is
   * refused. Without it there is no account, and any order is taken.
   */
  balance?: number;
  /** How many times the margin a position's value may be: 10 holds a tenth of it. Default 1, the whole value. */
  leverage?: number;
  /** What a move of one in price is worth for one unit: a contract's multiplier. Default 1. */
  multiplier?: number;
  /** What each fill costs, opening or closing. */
  commission?: PaperCommission;
  /**
   * Where the account is warned, as the equity's part of the margin its
   * positions hold (the margin level): `1` warns when the equity falls under
   * the margin. It says so once (the `marginCall` event), and again only
   * after the equity has been back over it. Nothing is closed. Needs
   * `balance`; without a level there is no warning.
   */
  marginCallLevel?: number;
  /**
   * Where the account is stopped out, as the equity's part of the margin
   * held: `0.5` closes positions when the equity falls under half the
   * margin. They are closed at the price there is, the one losing most
   * first, until the account is back over the level or holds none (fills
   * with `reason: 'liquidation'`). Needs `balance`; without a level nothing
   * is closed, and the equity may go under zero.
   */
  stopOutLevel?: number;
}

/** What a fill costs on the paper account: a part of its value and an amount a unit, and no less than `min`. */
export interface PaperCommission {
  /** A part of the fill's value: 0.001 is 0.1%. */
  rate?: number;
  /** An amount for each unit filled. */
  perUnit?: number;
  /** The least a fill costs. */
  min?: number;
}

const positive = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value > 0;

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
 * the profit or loss they realise), so a host can keep a trade history. An
 * account with money can be warned as its equity falls against its margin
 * (`marginCallLevel`) and stopped out (`stopOutLevel`).
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
  /** The cash, when the account keeps its money; null: no account. */
  private balance: number | null;
  private realised = 0;
  private commissionPaid = 0;
  private readonly leverage: number;
  private readonly multiplier: number;
  private readonly commission: PaperCommission;
  /** The account as last told, to tell it again only when it changed. */
  private accountTold = '';
  private readonly marginCallLevel: number | null;
  private readonly stopOutLevel: number | null;
  /** The warning is out: no other until the equity has been back over the level. */
  private called = false;

  constructor(options: PaperExecutionOptions = {}) {
    this.markPrice = options.markPrice ?? 0;
    this.net = options.positions === 'net';
    this.balance = options.balance !== undefined && Number.isFinite(options.balance) ? options.balance : null;
    this.leverage = positive(options.leverage) ? options.leverage : 1;
    this.multiplier = positive(options.multiplier) ? options.multiplier : 1;
    this.commission = options.commission ?? {};
    this.marginCallLevel = positive(options.marginCallLevel) ? options.marginCallLevel : null;
    this.stopOutLevel = positive(options.stopOutLevel) ? options.stopOutLevel : null;
  }

  /** The account's money now, or null when it keeps none (no `balance` was given). */
  getAccount(): AccountSummary | null {
    if (this.balance === null) return null;
    let unrealisedPnl = 0;
    let marginUsed = 0;
    for (const p of this.positions) {
      const open = p.quantity - (p.closedQuantity ?? 0);
      if (this.markPrice > 0) unrealisedPnl += (this.markPrice - p.entryPrice) * open * (p.side === 'buy' ? 1 : -1) * this.multiplier;
      marginUsed += this.marginOf(open, p.entryPrice);
    }
    const equity = this.balance + unrealisedPnl;
    const account: AccountSummary = { balance: this.balance, equity, unrealisedPnl, realisedPnl: this.realised, marginUsed, freeMargin: equity - marginUsed, commission: this.commissionPaid };
    // No level with no margin held: there is nothing the equity is a part of.
    if (marginUsed > 0) account.marginLevel = equity / marginUsed;
    return account;
  }

  /** What a position of `quantity` at `price` holds of the account. */
  private marginOf(quantity: number, price: number): number {
    return (quantity * price * this.multiplier) / this.leverage;
  }

  /** What a fill of `quantity` at `price` costs. */
  private commissionOf(quantity: number, price: number): number {
    const { rate, perUnit, min } = this.commission;
    const cost = (positive(rate) ? quantity * price * this.multiplier * rate : 0) + (positive(perUnit) ? quantity * perUnit : 0);
    return Math.max(cost, positive(min) ? min : 0);
  }

  /** Tell the account, when it changed since it was last told. */
  private tellAccount(): void {
    const account = this.getAccount();
    if (!account) return;
    // Back over the level, or holding nothing: the next fall under it is warned of again.
    if (!this.under(account, this.marginCallLevel)) this.called = false;
    const told = JSON.stringify(account);
    if (told === this.accountTold) return;
    this.accountTold = told;
    this.emit('account', account);
  }

  /** A fill's cost off the balance and on the fill; nothing written when it costs nothing. */
  private charge(fill: FillEvent): void {
    const cost = this.commissionOf(fill.quantity, fill.price);
    if (!(cost > 0)) return;
    fill.commission = cost;
    this.commissionPaid += cost;
    if (this.balance !== null) this.balance -= cost;
  }

  /** What a closed part made or lost, into the balance. */
  private realise(pnl: number): void {
    this.realised += pnl;
    if (this.balance !== null) this.balance += pnl;
  }

  /**
   * Why the account cannot carry `order` filled at `price`, or null when it
   * can (or keeps no money). It needs the margin of what it opens and its
   * commission; what it closes of a net position frees that part's margin.
   */
  private cannotCarry(order: TradingOrder, price: number): string | null {
    const account = this.getAccount();
    if (!account) return null;
    const held = this.net ? this.positions[0] : undefined;
    let opens = order.quantity;
    let freed = 0;
    if (held && held.side !== order.side) {
      const open = held.quantity - (held.closedQuantity ?? 0);
      const closes = Math.min(open, order.quantity);
      opens = order.quantity - closes;
      freed = this.marginOf(closes, held.entryPrice);
    }
    const needed = this.marginOf(opens, price) + this.commissionOf(order.quantity, price);
    return short(needed, account.freeMargin + freed);
  }

  /** The price an order is sized at: where it fills. A stop fills at its stop, the rest at their price. */
  private sizedAt(order: TradingOrder): number {
    return order.type === 'stop' ? order.stopPrice ?? order.price : order.price;
  }

  connect(_config: ExecutionConfig): void {
    this.state = 'connected';
    this.emit('connectionChange', this.state);
    this.emit('orders', this.orders);
    this.emit('positions', this.positions);
    this.tellAccount();
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
    // What the orders and the stops left is what the margin is counted on.
    this.warnOfMargin();
    this.stopOut();
    this.tellAccount();
  }

  /** Whether the account's equity is under `level` of the margin it holds. */
  private under(account: AccountSummary | null, level: number | null): boolean {
    return account !== null && level !== null && account.marginLevel !== undefined && account.marginLevel < level;
  }

  /** The margin call: said once as the equity falls under its level. */
  private warnOfMargin(): void {
    const account = this.getAccount();
    if (!account || this.marginCallLevel === null || !this.under(account, this.marginCallLevel)) return;
    if (this.called) return;
    this.called = true;
    const call: MarginCall = { marginLevel: account.marginLevel!, level: this.marginCallLevel, equity: account.equity, marginUsed: account.marginUsed };
    this.emit('marginCall', call);
  }

  /**
   * The stop-out: while the equity is under its level, the position losing
   * most at the price is closed there. Closing one frees its margin, which
   * may be enough; with the equity under zero nothing is, and all go.
   */
  private stopOut(): void {
    if (this.stopOutLevel === null || !(this.markPrice > 0)) return;
    let closed = false;
    while (this.under(this.getAccount(), this.stopOutLevel)) {
      const worst = this.losingMost();
      if (!worst) break;
      this.close(worst, this.markPrice, 'liquidation');
      closed = true;
    }
    if (closed) this.emit('positions', this.positions);
  }

  /** The position with the lowest open profit at the price, or undefined with none. */
  private losingMost(): TradingPosition | undefined {
    const pnl = (p: TradingPosition) => (this.markPrice - p.entryPrice) * (p.quantity - (p.closedQuantity ?? 0)) * (p.side === 'buy' ? 1 : -1);
    return this.positions.reduce<TradingPosition | undefined>((worst, p) => (worst === undefined || pnl(p) < pnl(worst) ? p : worst), undefined);
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
    if (dated && intent.expireTime! <= this.fillTime()) {
      throw new Error('The date of the good-till-date order has passed');
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
    const levels = levelsOf(intent.takeProfits, intent.side);
    if (levels) order.takeProfits = levels;

    // An order that fills now is sized at the price there is; one that waits, at where it will fill.
    const fillsNow = intent.type === 'market' || (atOnce && this.markPrice > 0);
    const lack = this.cannotCarry(order, fillsNow ? this.markPrice || intent.price : this.sizedAt(order));
    if (lack) throw new Error(lack);

    if (intent.type === 'market') {
      this.fill(order, this.markPrice || intent.price);
    } else if (atOnce) {
      // All of it now or none of it: the paper market has no size to fill a part with.
      // With no price yet there is nothing to fill it at.
      if (!(this.markPrice > 0) || !this.isTriggered(order)) throw new Error(`The ${intent.timeInForce} order was not filled at once: it is cancelled`);
      // At the price there is: its limit is the worst it takes.
      this.fill(order, this.markPrice);
    } else {
      this.orders = [...this.orders, order];
      this.emit('orders', this.orders);
    }
    return order;
  }

  async modifyOrder(intent: OrderModifyIntent): Promise<void> {
    this.orders = this.orders.map((o) => {
      if (o.id !== intent.orderId) return o;
      // A stop moves with its line, and a stop-limit's as far as its limit: the room between them stays.
      // A stop at its price goes to the new one itself, not there by a sum that could leave it a hair off.
      const stopPrice = o.stopPrice === undefined ? undefined : o.stopPrice === o.price ? intent.newPrice : o.stopPrice + (intent.newPrice - o.price);
      return stopPrice === undefined ? { ...o, price: intent.newPrice } : { ...o, price: intent.newPrice, stopPrice };
    });
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
      // Its levels, all of them: null (or none usable) takes them off; left out, or no list, keeps them.
      if (intent.takeProfits === null || Array.isArray(intent.takeProfits)) {
        const levels = beyondEntry(levelsOf(intent.takeProfits, p.side), p.side, p.entryPrice);
        if (levels) next.takeProfits = levels;
        else delete next.takeProfits;
      }
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
    this.tellAccount();
  }

  /** Close a position at the mark and open the same size the other way. */
  async reversePosition(intent: PositionReverseIntent): Promise<void> {
    const position = this.positions.find((p) => p.id === intent.positionId);
    if (!position) return;
    const price = this.markPrice || position.entryPrice;
    const quantity = position.quantity - (position.closedQuantity ?? 0);
    // Both halves or neither: the close frees the position's margin and costs a commission, as the opening does.
    const account = this.getAccount();
    if (account) {
      const lack = short(this.marginOf(quantity, price) + 2 * this.commissionOf(quantity, price), account.freeMargin + this.marginOf(quantity, position.entryPrice));
      if (lack) throw new Error(lack);
    }
    this.close(position, price, 'reverse');
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
    this.charge(fill);
    // The account first: what hears of the fill or the positions reads it as they left it.
    this.tellAccount();
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
    const levels = beyondEntry(order.takeProfits, order.side, price);
    if (levels) position.takeProfits = levels;
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
      // The fill's levels when it brings them, as its stops: they are the plan for the whole position now.
      const levels = beyondEntry(order.takeProfits, order.side, added.entryPrice);
      if (levels) added.takeProfits = levels;
      this.positions = [added];
      fill.positionId = held.id;
      return;
    }
    // Sizes built of fractions differ by a hair from their sum (0.1 + 0.2 and 0.3): as large is the same size.
    const same = Math.abs(order.quantity - open) <= QUANTITY_SLACK * Math.max(order.quantity, open);
    const closed = same ? open : Math.min(open, order.quantity);
    fill.pnl = (price - held.entryPrice) * closed * (held.side === 'buy' ? 1 : -1) * this.multiplier;
    this.realise(fill.pnl);
    fill.positionId = held.id;
    if (!same && order.quantity < open) {
      const left: TradingPosition = { ...held, quantity: open - closed };
      delete left.closedQuantity;
      this.positions = [left];
      return;
    }
    this.positions = [];
    if (!same && order.quantity > open) {
      const turned = this.opened(order, price, order.quantity - open);
      this.positions = [turned];
      fill.positionId = turned.id;
    }
  }

  /** Take a position off the book at `price`, reporting the fill and what it realised. */
  private close(position: TradingPosition, price: number, reason: FillReason, part?: number): void {
    const open = position.quantity - (position.closedQuantity ?? 0);
    // A part as large as what is open (to a hair) is all of it.
    const whole = part === undefined || part >= open * (1 - QUANTITY_SLACK);
    const quantity = whole ? open : part;
    this.positions = whole
      ? this.positions.filter((p) => p.id !== position.id)
      : this.positions.map((p) => (p.id === position.id ? { ...p, closedQuantity: (p.closedQuantity ?? 0) + quantity } : p));
    const direction = position.side === 'buy' ? 1 : -1;
    const fill: FillEvent = {
      orderId: this.nextId('ord'),
      side: opposite(position.side),
      price,
      quantity,
      time: this.fillTime(),
      positionId: position.id,
      reason,
      pnl: (price - position.entryPrice) * quantity * direction * this.multiplier,
    };
    this.realise(fill.pnl!);
    this.charge(fill);
    this.tellAccount();
    this.emit('fill', fill);
  }

  /** The good-till-date orders whose date has come (by the mark's time, else by the clock) come off the book. */
  private expireOrders(): void {
    const now = this.fillTime();
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
      // The money it needed has gone since it was placed: it comes off, and says why.
      const lack = this.cannotCarry(o, reached.has(o.id) ? this.markPrice : this.sizedAt(o));
      if (lack) {
        this.orders = this.orders.filter((other) => other.id !== o.id);
        this.emit('orders', this.orders);
        this.emit('error', { message: `Order ${o.id} was cancelled. ${lack}`, command: 'orderPlace' });
        continue;
      }
      // A limit that waited fills at its price; one that began working at this price fills at it, within its limit.
      this.fill(o, o.type !== 'limit' ? o.stopPrice ?? o.price : reached.has(o.id) ? this.markPrice : o.price);
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
    for (const held of [...this.positions]) {
      const long = held.side === 'buy';
      const reached = (target: number) => (long ? this.markPrice >= target : this.markPrice <= target);
      const hitSL =
        held.stopLoss !== undefined &&
        (long ? this.markPrice <= held.stopLoss : this.markPrice >= held.stopLoss);
      // Its levels first, the nearest first: each takes its part off at its own price.
      if (!hitSL && this.closeLevels(held, reached)) changed = true;
      const p = this.positions.find((other) => other.id === held.id);
      if (!p) continue;
      const hitTP = p.takeProfit !== undefined && reached(p.takeProfit);
      if (!hitSL && !hitTP) continue;
      // Filled at the stop's price, as a stop order would be.
      this.close(p, hitSL ? p.stopLoss! : p.takeProfit!, hitSL ? 'stopLoss' : 'takeProfit');
      changed = true;
    }
    if (this.trailStops()) changed = true;
    if (changed) this.emit('positions', this.positions);
  }

  /**
   * The parts of a position its take-profit levels take off at the price
   * now: each level reached closes its quantity (or what is left) at its own
   * price and goes. True when one did.
   */
  private closeLevels(position: TradingPosition, reached: (target: number) => boolean): boolean {
    let closed = false;
    for (;;) {
      const p = this.positions.find((other) => other.id === position.id);
      const level = p?.takeProfits?.[0];
      if (!p || !level || !reached(level.price)) return closed;
      const rest = p.takeProfits!.slice(1);
      // The level goes before its part does: what the close leaves has the levels still to come.
      this.positions = this.positions.map((other) => {
        if (other.id !== p.id) return other;
        const { takeProfits: _levels, ...without } = other;
        return rest.length > 0 ? { ...without, takeProfits: rest } : without;
      });
      this.close(this.positions.find((other) => other.id === p.id)!, level.price, 'takeProfit', level.quantity);
      closed = true;
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

/**
 * Take-profit levels as the account keeps them: those with a price and a
 * quantity above 0, the nearest to the entry first (the lowest for a long,
 * the highest for a short). Undefined with none.
 */
function levelsOf(levels: readonly TakeProfitLevel[] | null | undefined, side: TradingOrder['side']): TakeProfitLevel[] | undefined {
  if (!Array.isArray(levels)) return undefined;
  const usable = levels
    .filter((level) => level && positive(level.price) && positive(level.quantity))
    .map((level) => ({ price: level.price, quantity: level.quantity }))
    .sort((a, b) => (side === 'buy' ? a.price - b.price : b.price - a.price));
  return usable.length > 0 ? usable : undefined;
}

/**
 * The levels that are a profit from `entry`: past it the winning way. One at
 * the entry or on the losing side would close its part at once, at a price
 * the market is not at. Copies; undefined with none left.
 */
function beyondEntry(levels: readonly TakeProfitLevel[] | undefined, side: TradingOrder['side'], entry: number): TakeProfitLevel[] | undefined {
  const kept = (levels ?? []).filter((level) => (side === 'buy' ? level.price > entry : level.price < entry)).map((level) => ({ ...level }));
  return kept.length > 0 ? kept : undefined;
}

/** How far short of an order's need the account may be and still carry it, as a part of the need: a sum's rounding. */
const MONEY_SLACK = 1e-9;

/** Why `available` does not carry `needed`, or null when it does. */
function short(needed: number, available: number): string | null {
  return needed > available + MONEY_SLACK * Math.max(1, Math.abs(needed)) ? `Not enough free margin: the order needs ${money(needed)}, the account has ${money(available)}` : null;
}

/** A sum for a message: to the cent, or to four figures where it is under one. */
function money(amount: number): string {
  return String(Number(Math.abs(amount) >= 1 ? amount.toFixed(2) : amount.toPrecision(4)));
}

/** How near two sizes are, as a part of the larger, to be the same size. */
const QUANTITY_SLACK = 1e-9;

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
