import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { ZERO_COMMISSION } from './commission.js';
import { NO_SLIPPAGE } from './slippage.js';
import { Portfolio } from './Portfolio.js';
import { computeRiskMetrics } from './RiskMetrics.js';
import type {
  BacktestOptions,
  BacktestOrder,
  BacktestResult,
  CommissionModel,
  Fill,
  OrderStatus,
  Side,
  SlippageModel,
  StrategyContext,
  StrategyFn,
} from './types.js';

interface PendingOrder extends BacktestOrder {
  status: OrderStatus;
  placedAt: number;
}

/**
 * Bar-by-bar backtest engine.
 *
 * Execution model:
 *  - Strategy fn runs at close of each bar
 *  - Orders placed on bar N fill on bar N+1's open (market) or when
 *    bar N+1 trades through the limit/stop price
 *  - Equity is marked to close of every bar
 *
 * The engine is intentionally headless — no chart dependency — and produces
 * a result that can be visualised via @tradecanvas/chart's EquityCurveRenderer
 * or rendered into a report. See README for wiring examples.
 */
export class Backtester {
  private readonly commission: CommissionModel;
  private readonly slippage: SlippageModel;
  private readonly allowShort: boolean;
  private readonly portfolio: Portfolio;
  private pendingOrders: PendingOrder[] = [];
  private orderSeq = 0;

  constructor(opts: BacktestOptions) {
    this.commission = opts.commission ?? ZERO_COMMISSION;
    this.slippage = opts.slippage ?? NO_SLIPPAGE;
    this.allowShort = opts.allowShort ?? true;
    this.portfolio = new Portfolio({ initialCash: opts.initialCash });
  }

  run(data: DataSeries, strategy: StrategyFn): BacktestResult {
    if (data.length < 2) {
      throw new Error('Backtester requires at least 2 bars');
    }

    for (let i = 0; i < data.length; i++) {
      const bar = data[i];

      // 1. Fill any pending orders against this bar
      this.fillPendingOrders(bar);

      // 2. Mark-to-market after fills resolve
      this.portfolio.mark(bar.time, bar.close);

      // 3. Run strategy for the next bar (if there is one)
      if (i < data.length - 1) {
        const ctx = this.makeContext(bar, i, data.slice(0, i + 1));
        strategy(ctx);
      }
    }

    // Cancel anything left pending
    for (const order of this.pendingOrders) {
      if (order.status === 'pending') order.status = 'cancelled';
    }

    const equityCurve = this.portfolio.getEquityCurve();
    const initialCash = this.portfolio.getInitialCash();
    const trades = this.portfolio.getTrades();
    const finalEquity = equityCurve.length > 0
      ? equityCurve[equityCurve.length - 1].equity
      : initialCash;

    return {
      fills: this.portfolio.getFills(),
      trades,
      equityCurve,
      initialCash,
      finalEquity,
      metrics: computeRiskMetrics(initialCash, equityCurve, trades),
    };
  }

  private fillPendingOrders(bar: OHLCBar): void {
    for (const order of this.pendingOrders) {
      if (order.status !== 'pending') continue;
      const fillPrice = this.resolveFillPrice(order, bar);
      if (fillPrice === null) {
        if (order.timeInForce === 'day' || order.timeInForce === 'ioc') {
          order.status = 'cancelled';
        }
        continue;
      }
      const adjustedPrice = this.slippage.apply(fillPrice, order.side, bar);
      const commission = this.commission.calculate(order.quantity, adjustedPrice);
      const fill: Fill = {
        orderId: order.id,
        time: bar.time,
        price: adjustedPrice,
        quantity: order.quantity,
        side: order.side,
        commission,
        slippage: Math.abs(adjustedPrice - fillPrice),
        tag: order.tag,
      };
      this.portfolio.applyFill(fill);
      order.status = 'filled';
    }
    this.pendingOrders = this.pendingOrders.filter(
      (o) => o.status === 'pending',
    );
  }

  private resolveFillPrice(order: PendingOrder, bar: OHLCBar): number | null {
    switch (order.type) {
      case 'market':
        return bar.open;
      case 'limit':
        if (order.price === undefined) return null;
        if (order.side === 'long' && bar.low <= order.price) {
          return Math.min(order.price, bar.open);
        }
        if (order.side === 'short' && bar.high >= order.price) {
          return Math.max(order.price, bar.open);
        }
        return null;
      case 'stop':
        if (order.price === undefined) return null;
        if (order.side === 'long' && bar.high >= order.price) {
          return Math.max(order.price, bar.open);
        }
        if (order.side === 'short' && bar.low <= order.price) {
          return Math.min(order.price, bar.open);
        }
        return null;
    }
  }

  private makeContext(
    bar: OHLCBar,
    index: number,
    history: ReadonlyArray<OHLCBar>,
  ): StrategyContext {
    const portfolio = this.portfolio;
    return {
      bar,
      index,
      history,
      position: portfolio.getPosition(),
      cash: portfolio.getCash(),
      equity: portfolio.equity(bar.close),
      placeOrder: (order) => this.placeOrder(order, bar.time),
      close: (tag) => this.closePosition(bar.time, tag),
      cancel: (orderId) => this.cancelOrder(orderId),
    };
  }

  private placeOrder(
    raw: Omit<BacktestOrder, 'id'> & { id?: string },
    placedAt: number,
  ): string {
    if (raw.quantity <= 0) {
      throw new Error('order quantity must be > 0');
    }
    if (!this.allowShort && raw.side === 'short') {
      throw new Error('shorting is disabled');
    }
    const id = raw.id ?? `o-${++this.orderSeq}`;
    this.pendingOrders.push({
      id,
      side: raw.side,
      type: raw.type,
      quantity: raw.quantity,
      price: raw.price,
      tag: raw.tag,
      timeInForce: raw.timeInForce ?? 'gtc',
      status: 'pending',
      placedAt,
    });
    return id;
  }

  private closePosition(placedAt: number, tag?: string): string | null {
    const pos = this.portfolio.getPosition();
    if (!pos) return null;
    const closeSide: Side = pos.side === 'long' ? 'short' : 'long';
    return this.placeOrder(
      { side: closeSide, type: 'market', quantity: pos.quantity, tag },
      placedAt,
    );
  }

  private cancelOrder(orderId: string): boolean {
    const order = this.pendingOrders.find((o) => o.id === orderId);
    if (!order || order.status !== 'pending') return false;
    order.status = 'cancelled';
    return true;
  }
}
