import type {
  ExecutionAdapter,
  ExecutionEvent,
  ExecutionError,
  TradingOrder,
  TradingPosition,
  OrderPlaceIntent,
  OrderModifyIntent,
  OrderCancelIntent,
  PositionModifyIntent,
  PositionCloseIntent,
  PositionReverseIntent,
  FillEvent,
} from '@tradecanvas/commons';

/** The order/position intents the chart emits and an adapter consumes. */
export type ExecutionIntentType =
  | 'orderPlace'
  | 'orderModify'
  | 'orderCancel'
  | 'positionModify'
  | 'positionClose'
  | 'positionReverse';

/**
 * Surface the host (the Chart) provides so execution can be bridged without
 * the helper knowing anything about chart internals — which keeps it pure and
 * unit-testable.
 */
export interface ExecutionHost {
  /** Subscribe to an emitted intent; returns an unsubscribe function. */
  onIntent(type: ExecutionIntentType, handler: (payload: unknown) => void): () => void;
  /** Render the adapter's authoritative pending orders. */
  setOrders(orders: TradingOrder[]): void;
  /** Render the adapter's authoritative open positions. */
  setPositions(positions: TradingPosition[]): void;
  /** Surface an execution failure (adapter-reported or a failed command). */
  onError(error: ExecutionError): void;
  /** An order filled or a position closed (the adapter's `fill`). */
  onFill?(fill: FillEvent): void;
}

const COMMANDS: Record<
  ExecutionIntentType,
  (adapter: ExecutionAdapter, payload: unknown, positions: readonly TradingPosition[]) => Promise<unknown>
> = {
  orderPlace: (a, p) => a.placeOrder(p as OrderPlaceIntent),
  orderModify: (a, p) => a.modifyOrder(p as OrderModifyIntent),
  orderCancel: (a, p) => a.cancelOrder(p as OrderCancelIntent),
  positionModify: (a, p) => a.modifyPosition(p as PositionModifyIntent),
  positionClose: (a, p) => a.closePosition(p as PositionCloseIntent),
  positionReverse: (a, p, positions) => reverse(a, p as PositionReverseIntent, positions),
};

/**
 * Reverse a position: the adapter's own `reversePosition`, or else close it
 * and place a market order the other way for the size that was open.
 */
async function reverse(adapter: ExecutionAdapter, intent: PositionReverseIntent, positions: readonly TradingPosition[]): Promise<void> {
  if (adapter.reversePosition) {
    await adapter.reversePosition(intent);
    return;
  }
  const position = positions.find((p) => p.id === intent.positionId);
  if (!position) throw new Error(`No position ${intent.positionId} to reverse`);
  const quantity = position.quantity - (position.closedQuantity ?? 0);
  await adapter.closePosition({ positionId: position.id });
  await adapter.placeOrder({
    side: position.side === 'buy' ? 'sell' : 'buy',
    type: 'market',
    price: position.entryPrice,
    quantity,
  });
}

/**
 * Bridge an `ExecutionAdapter` to a host: render the adapter's authoritative
 * orders/positions, and route the host's emitted intents into adapter
 * commands. The adapter is the single source of truth. Returns a teardown that
 * removes every subscription.
 */
export function wireExecution(adapter: ExecutionAdapter, host: ExecutionHost): () => void {
  const teardowns: Array<() => void> = [];

  // Adapter → host: authoritative state + errors. The positions are kept to
  // reverse one when the adapter can't.
  let positions: readonly TradingPosition[] = [];
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
  teardowns.push(
    () => adapter.off('orders', onOrders),
    () => adapter.off('positions', onPositions),
    () => adapter.off('error', onError),
    () => adapter.off('fill', onFill),
  );

  // Host → adapter: route each emitted intent into the matching command.
  for (const type of Object.keys(COMMANDS) as ExecutionIntentType[]) {
    const command = COMMANDS[type];
    const unsub = host.onIntent(type, (payload) => {
      Promise.resolve(command(adapter, payload, positions)).catch((cause) =>
        host.onError({ message: `Execution command failed: ${type}`, cause }),
      );
    });
    teardowns.push(unsub);
  }

  return () => {
    for (const teardown of teardowns) teardown();
  };
}
