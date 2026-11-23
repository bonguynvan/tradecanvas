import type {
  AccountSummary,
  ExecutionAdapter,
  ExecutionEvent,
  ExecutionError,
  TradingOrder,
  TradingPosition,
  OrderPlaceIntent,
  OrderModifyIntent,
  BracketPlacePayload,
  OrderCancelIntent,
  PositionModifyIntent,
  PositionCloseIntent,
  PositionReverseIntent,
  FillEvent,
  MarginCall,
} from '@tradecanvas/commons';
import { inferOrderType } from '@tradecanvas/core';

/** The order/position intents the chart emits and an adapter consumes. */
export type ExecutionIntentType =
  | 'orderPlace'
  | 'orderModify'
  | 'orderCancel'
  | 'positionModify'
  | 'positionClose'
  | 'positionReverse';

/** The intents a host is asked for: the adapter's commands, and a confirmed bracket. */
export type HostIntentType = ExecutionIntentType | 'bracketPlace';

/** How the wiring treats what is not a plain command. */
export interface WireExecutionOptions {
  /** `'place'` (the default): a confirmed bracket goes to the adapter as an order. `'event'`: it stays an event. */
  brackets?: 'event' | 'place';
}

/**
 * Surface the host (the Chart) provides so execution can be bridged without
 * the helper knowing anything about chart internals — which keeps it pure and
 * unit-testable.
 */
export interface ExecutionHost {
  /** Subscribe to an emitted intent; returns an unsubscribe function. */
  onIntent(type: HostIntentType, handler: (payload: unknown) => void): () => void;
  /** Render the adapter's authoritative pending orders. */
  setOrders(orders: TradingOrder[]): void;
  /** Render the adapter's authoritative open positions. */
  setPositions(positions: TradingPosition[]): void;
  /** Surface an execution failure (adapter-reported or a failed command). */
  onError(error: ExecutionError): void;
  /** The adapter took an order asked for (`orderPlace`): the one asked for, and the order it made of it. */
  onOrderPlaced?(intent: OrderPlaceIntent, order: TradingOrder): void;
  /** An id for an order the wiring makes itself (a confirmed bracket's, the one that reverses a position): no order goes out with none. */
  newClientOrderId?(): string;
  /** The symbol the chart shows, which a confirmed bracket's order is for; undefined with none shown. */
  symbol?(): string | undefined;
  /** An order filled or a position closed (the adapter's `fill`). */
  onFill?(fill: FillEvent): void;
  /** The positions on the chart, until the adapter reports its own. */
  getPositions?(): readonly TradingPosition[];
  /** The price now, which a bracket's entry is a limit or a stop against. */
  marketPrice?(): number | null;
  /** A confirmed bracket the adapter took, as the order it placed. */
  onBracketOrder?(order: TradingOrder, bracket: BracketPlacePayload): void;
  /** The account's money, from an adapter that keeps one: as it is on wiring, then as it changes. */
  setAccount?(account: AccountSummary): void;
  /** The account was warned of its margin (the adapter's `marginCall`). */
  onMarginCall?(call: MarginCall): void;
}

/** What a command can read: the latest positions, the reverses under way, and an id for an order it makes. */
interface CommandContext {
  positions: () => readonly TradingPosition[];
  reversing: Set<string>;
  orderId: () => { clientOrderId?: string };
}

/** The commands routed as they come. An order asked for (`orderPlace`) is not one of them: what became of it is told (see below). */
const COMMANDS: Record<
  Exclude<ExecutionIntentType, 'orderPlace'>,
  (adapter: ExecutionAdapter, payload: unknown, context: CommandContext) => Promise<unknown>
> = {
  orderModify: (a, p) => a.modifyOrder(p as OrderModifyIntent),
  orderCancel: (a, p) => a.cancelOrder(p as OrderCancelIntent),
  positionModify: (a, p) => a.modifyPosition(p as PositionModifyIntent),
  positionClose: (a, p) => a.closePosition(p as PositionCloseIntent),
  positionReverse: (a, p, context) => reverse(a, p as PositionReverseIntent, context),
};

/**
 * Reverse a position: the adapter's own `reversePosition`, or else close it
 * and place a market order the other way for the size that was open. A
 * second reverse of the same position while one is under way is ignored.
 */
async function reverse(adapter: ExecutionAdapter, intent: PositionReverseIntent, context: CommandContext): Promise<void> {
  const { reversing } = context;
  if (reversing.has(intent.positionId)) return;
  reversing.add(intent.positionId);
  try {
    if (adapter.reversePosition) {
      await adapter.reversePosition(intent);
      return;
    }
    const position = context.positions().find((p) => p.id === intent.positionId);
    if (!position) throw new Error(`No position ${intent.positionId} to reverse`);
    const quantity = position.quantity - (position.closedQuantity ?? 0);
    if (!(quantity > 0)) throw new Error(`Position ${intent.positionId} has nothing open to reverse`);
    await adapter.closePosition({ positionId: position.id });
    try {
      await adapter.placeOrder({
        side: position.side === 'buy' ? 'sell' : 'buy',
        type: 'market',
        price: position.entryPrice,
        quantity,
        ...context.orderId(),
        // Of the position's own symbol, whatever the chart shows now.
        ...(position.symbol === undefined ? {} : { symbol: position.symbol }),
      });
    } catch (cause) {
      throw new Error(`Position ${intent.positionId} was closed, but the order the other way failed`, { cause });
    }
  } finally {
    reversing.delete(intent.positionId);
  }
}

/**
 * A bracket as the one order a broker takes for it: the entry, a limit where
 * the price must come back to it and a stop where it must run on to it, its
 * quantity, and the stop-loss and take-profit on it.
 */
export function bracketOrderIntent(bracket: BracketPlacePayload & { quantity: number }, marketPrice: number): OrderPlaceIntent {
  return {
    side: bracket.side,
    type: inferOrderType(bracket.side, bracket.entry, marketPrice),
    price: bracket.entry,
    quantity: bracket.quantity,
    stopLoss: bracket.stopLoss,
    takeProfit: bracket.takeProfit,
  };
}

/** Why the chart does not send a bracket: no size anyone saw, or no price to tell its entry's kind by. */
function unsendable(bracket: BracketPlacePayload, marketPrice: number | null): ExecutionError | null {
  const quantity = bracket.quantity;
  if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) {
    return { message: 'A bracket with no quantity is not sent to the adapter', command: 'bracketPlace', reason: 'noQuantity' };
  }
  if (marketPrice === null || !Number.isFinite(marketPrice)) {
    return { message: 'A bracket is not sent with no price to tell a limit entry from a stop', command: 'bracketPlace', reason: 'noPrice' };
  }
  return null;
}

/**
 * Bridge an `ExecutionAdapter` to a host: render the adapter's authoritative
 * orders/positions, and route the host's emitted intents into adapter
 * commands. The adapter is the single source of truth. Returns a teardown that
 * removes every subscription.
 */
export function wireExecution(adapter: ExecutionAdapter, host: ExecutionHost, options: WireExecutionOptions = {}): () => void {
  const teardowns: Array<() => void> = [];

  // Adapter → host: authoritative state + errors. The positions are kept to
  // reverse one when the adapter can't.
  let positions: readonly TradingPosition[] | null = null;
  const context: CommandContext = {
    positions: () => positions ?? host.getPositions?.() ?? [],
    reversing: new Set(),
    // An id of the host's for an order made here; none where the host gives none.
    orderId: () => {
      const id = host.newClientOrderId?.();
      return id === undefined ? {} : { clientOrderId: id };
    },
  };
  const onOrders = (e: ExecutionEvent<TradingOrder[]>) => host.setOrders(e.data ?? []);
  const onPositions = (e: ExecutionEvent<TradingPosition[]>) => {
    positions = e.data ?? [];
    host.setPositions([...positions]);
  };
  const onError = (e: ExecutionEvent<ExecutionError>) =>
    host.onError(e.data ?? { message: 'Execution error' });
  const onFill = (e: ExecutionEvent<FillEvent>) => {
    if (e.data) host.onFill?.(e.data);
  };
  adapter.on<TradingOrder[]>('orders', onOrders);
  adapter.on<TradingPosition[]>('positions', onPositions);
  adapter.on<ExecutionError>('error', onError);
  adapter.on<FillEvent>('fill', onFill);
  const onAccount = (e: ExecutionEvent<AccountSummary>) => {
    if (e.data) host.setAccount?.(e.data);
  };
  adapter.on<AccountSummary>('account', onAccount);
  const account = adapter.getAccount?.();
  if (account) host.setAccount?.(account);
  const onMarginCall = (e: ExecutionEvent<MarginCall>) => {
    if (e.data) host.onMarginCall?.(e.data);
  };
  adapter.on<MarginCall>('marginCall', onMarginCall);
  teardowns.push(
    () => adapter.off('account', onAccount),
    () => adapter.off('marginCall', onMarginCall),
  );
  teardowns.push(
    () => adapter.off('orders', onOrders),
    () => adapter.off('positions', onPositions),
    () => adapter.off('error', onError),
    () => adapter.off('fill', onFill),
  );

  // A bracket's answer that comes after the teardown is for an adapter no longer connected: it is dropped.
  let connected = true;
  teardowns.push(() => {
    connected = false;
  });

  // Host → adapter: route each emitted intent into the matching command.
  for (const type of Object.keys(COMMANDS) as (keyof typeof COMMANDS)[]) {
    const command = COMMANDS[type];
    const unsub = host.onIntent(type, (payload) => {
      Promise.resolve(command(adapter, payload, context)).catch((cause) =>
        host.onError({ message: `Execution command failed: ${type}`, cause, command: type }),
      );
    });
    teardowns.push(unsub);
  }

  // An order asked for: the host is told what became of it, by the id it went out with. Until
  // then it is on its way, and what asked for it (a ticket) can wait and not send it again. Told
  // even when the adapter was taken away before it answered: the order went out, and a ticket
  // that is never answered waits for good.
  teardowns.push(host.onIntent('orderPlace', (payload) => {
    const intent = payload as OrderPlaceIntent;
    // An adapter that throws at once is reported as one that refuses.
    Promise.resolve()
      .then(() => adapter.placeOrder(intent))
      .then((order) => host.onOrderPlaced?.(intent, order))
      .catch((cause) => {
        const named = intent.clientOrderId === undefined ? {} : { clientOrderId: intent.clientOrderId };
        host.onError({ message: 'Execution command failed: orderPlace', cause, command: 'orderPlace', ...named });
      });
  }));

  // A confirmed bracket, as one order with its stop-loss and take-profit, unless the app places it itself.
  if (options.brackets !== 'event') {
    teardowns.push(host.onIntent('bracketPlace', (payload) => {
      const bracket = payload as BracketPlacePayload;
      const marketPrice = host.marketPrice?.() ?? null;
      const refused = unsendable(bracket, marketPrice);
      if (refused) {
        host.onError(refused);
        return;
      }
      const symbol = host.symbol?.();
      const intent = {
        ...bracketOrderIntent(bracket as BracketPlacePayload & { quantity: number }, marketPrice as number),
        ...context.orderId(),
        ...(symbol === undefined ? {} : { symbol }),
      };
      // An adapter that throws at once is reported as one that refuses.
      Promise.resolve()
        .then(() => adapter.placeOrder(intent))
        .then((order) => {
          if (connected) host.onBracketOrder?.(order, bracket);
        })
        .catch((cause) => {
          if (connected) host.onError({ message: 'Execution command failed: bracketPlace', cause, command: 'bracketPlace' });
        });
    }));
  }

  return () => {
    for (const teardown of teardowns) teardown();
  };
}
