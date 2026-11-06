import { WidgetAccountPanel } from './WidgetAccountPanel.js';
import { WidgetOrderTicket } from './WidgetOrderTicket.js';
import type { OrderTicketRules } from './orderTicket.js';
import { WidgetBracketBar } from './WidgetBracketBar.js';
import { WidgetDepthLadder } from './WidgetDepthLadder.js';
import type { DepthData } from '@tradecanvas/commons';
import { fill, type MessageKey } from './i18n.js';
import type { ChartWidget } from './ChartWidget.js';

/** What trading reads of the widget around it, and asks of it. */
export interface TradingHost {
  readonly chart: ChartWidget['chart'];
  readonly destroyed: ChartWidget['destroyed'];
  readonly dock: ChartWidget['dock'];
  readonly featureState: ChartWidget['featureState'];
  formatAlertPrice: ChartWidget['formatAlertPrice'];
  say: ChartWidget['say'];
  readonly state: ChartWidget['state'];
  readonly t: ChartWidget['t'];
}

/**
 * Trading in the widget: the account panel, the order ticket and its rules, orders placed at
 * a price on the chart, the depth ladder and the bracket bar.
 */
export class WidgetTrading {
  constructor(private readonly host: TradingHost) {}

  accountPanel: WidgetAccountPanel | null = null;

  orderTicket: WidgetOrderTicket | null = null;

  accountFrame = 0;

  bracketBar: WidgetBracketBar | null = null;

  depthLadder: WidgetDepthLadder | null = null;

  /** Open or close the account panel (no argument: the other way from now). */
  toggleAccountPanel(open?: boolean): void {
    const panel = this.accountPanel;
    if (!panel || open === panel.isOpen()) return;
    // Switched off, it only closes.
    if (!panel.isOpen() && !this.host.featureState.accountPanel) return;
    panel.toggle();
  }

  /** The order ticket, at a price from the chart (or the market). */
  openOrderTicket(price?: number): void {
    if (!this.host.featureState.orderTicket) return;
    const data = this.host.chart.getData();
    this.orderTicket?.open({
      price,
      lastPrice: data.length > 0 ? data[data.length - 1].close : null,
      rules: this.orderRules(),
      symbol: this.host.state.symbol,
      // − and + move a price by the market's step; a click on the chart lands between steps.
      step: (p) => this.host.chart.getPriceStep(p),
      round: (p) => this.host.chart.roundPrice(p),
    });
  }

  /** A market's rules for the order ticket (`setMarket`): its step, the day's limits, its lot. */
  private orderRules(): OrderTicketRules {
    const market = this.host.chart.getMarket();
    if (!market) return {};
    const stepped = market.priceStep !== undefined || (market.priceSteps?.length ?? 0) > 0;
    return {
      roundPrice: stepped ? (p) => this.host.chart.roundPrice(p) : undefined,
      limits: this.host.chart.getPriceLimits(),
      lot: market.volumeUnit,
      multiplier: market.contractMultiplier,
    };
  }

  /** Redraw the account panel once a frame at most (ticks, fills and order changes come in bursts). */
  refreshAccountSoon(): void {
    if (this.accountFrame || !this.accountPanel) return;
    this.accountFrame = requestAnimationFrame(() => {
      this.accountFrame = 0;
      if (!this.host.destroyed) this.refreshAccount();
    });
  }

  refreshAccount(): void {
    if (!this.accountPanel) return;
    const data = this.host.chart.getData();
    const price = data.length > 0 ? data[data.length - 1].close : null;
    this.accountPanel.update({
      positions: this.host.chart.getPositions(),
      orders: this.host.chart.getOrders(),
      fills: this.host.chart.getFills(),
      price,
      realisedPnl: this.host.chart.getRealisedPnl(),
    });
    this.orderTicket?.setLastPrice(price);
  }

  /** Ask for a limit or stop order at `price` (one unit), and say so. */
  placeOrderAt(kind: 'buyLimit' | 'sellLimit' | 'buyStop' | 'sellStop', price: number): void {
    const side = kind.startsWith('buy') ? 'buy' : 'sell';
    const stop = kind.endsWith('Stop');
    this.host.chart.placeOrderIntent(stop ? { side, type: 'stop', price, stopPrice: price, quantity: 1 } : { side, type: 'limit', price, quantity: 1 });
    this.host.say(fill(this.host.t(`order.${kind}` as MessageKey), { price: this.host.formatAlertPrice(price) }));
  }

  /** The depth ladder, a page of the dock: open or shut it (the Trade menu's entry). */
  toggleLadder(): void {
    if (!this.depthLadder || !this.host.featureState.depthLadder) return;
    this.host.dock?.toggle('depthLadder');
  }

  /** Feed order-book depth to the chart overlay, depth ladder, and heatmap. */
  setDepth(depth: DepthData | null): void {
    this.host.chart.setDepthData(depth);
    this.depthLadder?.setData(depth);
    if (depth) this.host.chart.pushDepthSnapshot(depth);
  }

  /** Begin a draggable bracket order at the latest price and show the action bar. */
  startBracket(side: 'buy' | 'sell'): void {
    if (this.host.chart.startBracket(side)) {
      this.bracketBar?.show(side);
    }
  }
}
