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
} from '@tradecanvas/commons';

/** The five order/position intents the chart emits and an adapter consumes. */
export type ExecutionIntentType =
  | 'orderPlace'
  | 'orderModify'
  | 'orderCancel'
  | 'positionModify'
  | 'positionClose';

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
}

const COMMANDS: Record<
  ExecutionIntentType,
  (adapter: ExecutionAdapter, payload: unknown) => Promise<unknown>
> = {
  orderPlace: (a, p) => a.placeOrder(p as OrderPlaceIntent),
  orderModify: (a, p) => a.modifyOrder(p as OrderModifyIntent),
  orderCancel: (a, p) => a.cancelOrder(p as OrderCancelIntent),
  positionModify: (a, p) => a.modifyPosition(p as PositionModifyIntent),
  positionClose: (a, p) => a.closePosition(p as PositionCloseIntent),
};

/**
 * Bridge an `ExecutionAdapter` to a host: render the adapter's authoritative
 * orders/positions, and route the host's emitted intents into adapter
 * commands. The adapter is the single source of truth. Returns a teardown that
 * removes every subscription.
 */
export function wireExecution(adapter: ExecutionAdapter, host: ExecutionHost): () => void {
  const teardowns: Array<() => void> = [];

  // Adapter → host: authoritative state + errors.
  const onOrders = (e: ExecutionEvent<TradingOrder[]>) => host.setOrders(e.data ?? []);
  const onPositions = (e: ExecutionEvent<TradingPosition[]>) => host.setPositions(e.data ?? []);
  const onError = (e: ExecutionEvent<ExecutionError>) =>
    host.onError(e.data ?? { message: 'Execution error' });
  adapter.on<TradingOrder[]>('orders', onOrders);
  adapter.on<TradingPosition[]>('positions', onPositions);
  adapter.on<ExecutionError>('error', onError);
  teardowns.push(
    () => adapter.off('orders', onOrders),
    () => adapter.off('positions', onPositions),
    () => adapter.off('error', onError),
  );

  // Host → adapter: route each emitted intent into the matching command.
  for (const type of Object.keys(COMMANDS) as ExecutionIntentType[]) {
    const command = COMMANDS[type];
    const unsub = host.onIntent(type, (payload) => {
      Promise.resolve(command(adapter, payload)).catch((cause) =>
        host.onError({ message: `Execution command failed: ${type}`, cause }),
      );
    });
    teardowns.push(unsub);
  }

  return () => {
    for (const teardown of teardowns) teardown();
  };
}
