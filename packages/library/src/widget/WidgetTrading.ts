import { WidgetAccountPanel } from './WidgetAccountPanel.js';
import { WidgetOrderTicket, type OrderTicketStart } from './WidgetOrderTicket.js';
import type { OrderTicketRules } from './orderTicket.js';
import { WidgetBracketBar } from './WidgetBracketBar.js';
import { WidgetDepthLadder } from './WidgetDepthLadder.js';
import type { WidgetQuoteButtons } from './WidgetQuoteButtons.js';
import type { DepthData, ExecutionErrorPayload, FillEvent } from '@tradecanvas/commons';
import { stepDecimals } from '@tradecanvas/commons';
import { fill, type MessageKey } from './i18n.js';
import { positionLevels, type BracketSize } from '@tradecanvas/core';
import type { ChartWidget } from './ChartWidget.js';
import { ofSymbol } from '../model/TradingBook.js';
import type { FeedHealth } from './feedHealth.js';

/** Prices that differ by less than this are the same price (float dust), as the order ticket has it. */
const LIMIT_EPSILON = 1e-9;

/** The digits a quantity is written to when it is a sum of parts: the sum's rounding is past them. */
const QUANTITY_DIGITS = 12;

/** Why the adapter refused something: its own words when it gave them, else the error's. */
export function refusalReason(error: Pick<ExecutionErrorPayload, 'message' | 'cause'>): string {
  const { cause } = error;
  return cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : error.message;
}

/** What trading reads of the widget around it, and asks of it. */
export interface TradingHost {
  readonly chart: ChartWidget['chart'];
  readonly destroyed: ChartWidget['destroyed'];
  readonly dock: ChartWidget['docking']['dock'];
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
  private feed: FeedHealth = 'live';

  accountFrame = 0;

  bracketBar: WidgetBracketBar | null = null;

  /** The quantity last typed for a bracket: the next one starts with it. */
  private bracketQuantity: number | null = null;

  depthLadder: WidgetDepthLadder | null = null;

  /** Sell and Buy on the chart, under its legend. */
  quoteButtons: WidgetQuoteButtons | null = null;

  /** The activity log as last read, and whether something was logged since: it is read again only then. */
  private log: ReturnType<TradingHost['chart']['getActivityLog']> = [];
  private logStale = true;

  /** An order the adapter refused: the widget had said it was sent, so it says this too, with the toasts off as well. */
  sayOrderRefused(error: ExecutionErrorPayload): void {
    this.host.say(fill(this.host.t('order.refused'), { reason: refusalReason(error) }), 'error');
  }

  /** A fill that dropped the rest of its order (immediate-or-cancel, filled in part): how much filled, of how much. */
  sayPartDropped(event: FillEvent): void {
    const { quantity, dropped } = event;
    if (dropped === undefined || !(dropped > 0)) return;
    const asked = Number((quantity + dropped).toPrecision(QUANTITY_DIGITS));
    this.host.say(fill(this.host.t('order.partDropped'), { filled: quantity, quantity: asked }));
  }

  /** Something the log records happened: the panel reads it again on its next frame. */
  markLogStale(): void {
    this.logStale = true;
  }

  /**
   * The Sell and Buy buttons with the prices now: the best bid and ask, or
   * the last price for both where the feed gives none or one side only, and on a replay,
   * whose prices are not the live quote's. Shown while an execution adapter
   * is connected to the chart (there is a broker to send to), and the order
   * ticket and the buttons are switched on. Returns whether they are shown.
   */
  refreshQuote(): boolean {
    const buttons = this.quoteButtons;
    if (!buttons) return false;
    const shown = this.host.featureState.orderTicket && this.host.featureState.tradeButtons && this.host.chart.getExecutionAdapter() != null;
    buttons.setShown(shown);
    if (!shown) return false;
    const last = this.host.chart.getData().at(-1)?.close ?? null;
    // Both sides or neither: one side beside the last price is no spread, and a bid is no price to buy at.
    buttons.update(this.quote() ?? { bid: last, ask: last });
    return true;
  }

  /** Open or close the account panel (no argument: the other way from now). */
  toggleAccountPanel(open?: boolean): void {
    const panel = this.accountPanel;
    if (!panel || open === panel.isOpen()) return;
    // Switched off, it only closes.
    if (!panel.isOpen() && !this.host.featureState.accountPanel) return;
    panel.toggle();
  }

  /** The order ticket, at a price from the chart (or the market), and with the fields a caller fills. */
  openOrderTicket(price?: number, start: Partial<OrderTicketStart> = {}): void {
    if (!this.host.featureState.orderTicket) return;
    const data = this.host.chart.getData();
    this.orderTicket?.open({
      ...start,
      price: price ?? start.price,
      lastPrice: data.length > 0 ? data[data.length - 1].close : null,
      quote: this.quote(),
      rules: this.orderRules(),
      symbol: this.host.state.symbol,
      // − and + move a price by the market's step; a click on the chart lands between steps.
      step: (p) => this.host.chart.getPriceStep(p),
      round: (p) => this.host.chart.roundPrice(p),
    });
    this.orderTicket?.setPriceLive(this.feed === 'live');
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

  /** The working orders the ladder marks on its rows: those of the symbol whose book it shows. */
  refreshLadderOrders(): void {
    this.depthLadder?.setOrders(ofSymbol(this.host.chart.getOrders(), this.host.chart.getSymbol()));
  }

  /** Redraw the account panel once a frame at most (ticks, fills and order changes come in bursts). */
  refreshAccountSoon(): void {
    if (this.accountFrame || (!this.accountPanel && !this.quoteButtons)) return;
    this.accountFrame = requestAnimationFrame(() => {
      this.accountFrame = 0;
      if (!this.host.destroyed) this.refreshAccount();
    });
  }

  refreshAccount(): void {
    this.refreshQuote();
    if (!this.accountPanel) return;
    const data = this.host.chart.getData();
    const price = data.length > 0 ? data[data.length - 1].close : null;
    this.accountPanel.update({
      positions: this.host.chart.getPositions(),
      orders: this.host.chart.getOrders(),
      fills: this.host.chart.getFills(),
      price,
      symbol: this.host.chart.getSymbol() || undefined,
      realisedPnl: this.host.chart.getRealisedPnl(),
      account: this.host.chart.getAccount(),
      log: this.activityLog(),
      multiplier: this.host.chart.getMarket()?.contractMultiplier,
    });
    this.orderTicket?.setLastPrice(price, this.quote());
  }

  /**
   * The best bid and ask now, where the feed gives both: what a Sell and a Buy trade at, on the
   * buttons and in the ticket. Null with one side only (a bid is no price to buy at), with none,
   * and on a replay, whose bars carry no quote: both sides are then at the last price.
   */
  private quote(): { bid: number; ask: number } | null {
    const live = this.host.chart.isReplayActive() ? null : this.host.chart.getBidAsk();
    // A bid over its ask is a feed that fell behind on one side: no pair of prices to trade by.
    return live?.bid !== undefined && live.ask !== undefined && live.bid <= live.ask ? { bid: live.bid, ask: live.ask } : null;
  }

  /** What an order asked for in one press is for: the market's lot where it trades in lots (HOSE: 100 shares), else one. */
  private quickQuantity(): number {
    const lot = this.host.chart.getMarket()?.volumeUnit;
    return lot !== undefined && lot > 1 ? lot : 1;
  }

  /**
   * What the price on the chart is worth (`feedHealth`). Not live, the ticket says so and sends
   * no order at the market. With the feed down, an order asked for in one press, or a bracket
   * or a draft confirmed, is held back too: the chart itself has stopped. A feed that is only
   * quiet holds none of those back: their price is the trader's own, and a market after hours
   * is quiet.
   */
  setFeed(health: FeedHealth): void {
    this.feed = health;
    this.orderTicket?.setPriceLive(health === 'live');
  }

  /** Whether an order asked for in one press may go out: not while the feed is down, and it says why. */
  feedUp(): boolean {
    if (this.feed !== 'down') return true;
    this.host.say(this.host.t('order.noLivePrice'), 'error');
    return false;
  }

  /** A limit order from a rung of the depth ladder, for the market's lot. Past the day's limits it is not asked for. */
  placeLadderOrder(side: 'buy' | 'sell', price: number): void {
    if (!this.feedUp() || !this.allowedToday(price)) return;
    this.host.chart.placeOrderIntent({ side, type: 'limit', price, quantity: this.quickQuantity() });
    this.host.say(fill(this.host.t(side === 'buy' ? 'order.buyLimit' : 'order.sellLimit'), { price: this.host.formatAlertPrice(price) }));
  }

  /** The activity log, read from the chart only when something was logged since the last read. */
  private activityLog(): ReturnType<TradingHost['chart']['getActivityLog']> {
    if (this.logStale) {
      this.log = this.host.chart.getActivityLog();
      this.logStale = false;
    }
    return this.log;
  }

  /**
   * Whether an order may be at `price` today: inside the day's ceiling and
   * floor, where the market has them. Past them it says what today's prices
   * are, in the ticket's own words, and answers no.
   */
  allowedToday(price: number): boolean {
    const limits = this.host.chart.getPriceLimits();
    if (!limits || (price <= limits.ceiling + LIMIT_EPSILON && price >= limits.floor - LIMIT_EPSILON)) return true;
    const { formatAlertPrice } = this.host;
    this.host.say(fill(this.host.t('ticket.problem.priceLimits'), { floor: formatAlertPrice(limits.floor), ceiling: formatAlertPrice(limits.ceiling) }), 'error');
    return false;
  }

  /** Ask for a limit or stop order at `price`, for the market's lot, and say so. Past the day's limits it is not asked for. */
  placeOrderAt(kind: 'buyLimit' | 'sellLimit' | 'buyStop' | 'sellStop', price: number): void {
    if (!this.feedUp() || !this.allowedToday(price)) return;
    const side = kind.startsWith('buy') ? 'buy' : 'sell';
    const stop = kind.endsWith('Stop');
    const quantity = this.quickQuantity();
    this.host.chart.placeOrderIntent(stop ? { side, type: 'stop', price, stopPrice: price, quantity } : { side, type: 'limit', price, quantity });
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

  /**
   * Begin a draggable bracket order at the latest price and show the action
   * bar. Its quantity is typed in the bar: it starts at `size.quantity`,
   * else at the one last typed, else at the market's lot (one without). A
   * bracket sized by `size.risk` has no field: its quantity follows its lines.
   */
  startBracket(side: 'buy' | 'sell', size?: BracketSize): void {
    if (size?.risk !== undefined) {
      if (this.host.chart.startBracket(side, undefined, size)) this.bracketBar?.show(side);
      return;
    }
    const lot = this.host.chart.getMarket()?.volumeUnit;
    const board = lot !== undefined && lot > 1 ? lot : null;
    const quantity = firstQuantity(size?.quantity, this.bracketQuantity, board);
    if (!this.host.chart.startBracket(side, undefined, { ...size, quantity })) return;
    this.bracketBar?.show(side, {
      quantity,
      // A lot, else the quantity's own last digit (0.5 moves by 0.1), as the order ticket steps.
      step: (q) => board ?? lastDigitStep(q),
    });
  }

  /** The bar's quantity field was typed in: the bracket takes it, and the next one starts with it. */
  setBracketQuantity(quantity: number | null): void {
    if (quantity !== null) this.bracketQuantity = quantity;
    this.host.chart.setBracketSize(quantity === null ? undefined : { quantity });
  }

  /** Open the order ticket from a Long/Short Position drawing, filled with its levels. */
  openOrderTicketFromDrawing(id: string): void {
    const levels = positionLevels(this.host.chart.getDrawings().find((d) => d.id === id));
    if (!levels) return;
    // The size the drawing writes: its risk unrounded, taken down to the decimals it shows.
    const decimals = Math.max(0, Math.min(8, Math.round(levels.quantityDecimals)));
    const step = 10 ** decimals;
    this.openOrderTicket(levels.entry, {
      side: levels.side,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
      quantity: Math.floor(levels.quantity * step) / step,
    });
  }
}

/** The quantity a bracket starts with: the one asked for, else the one last typed when the market's lot takes it, else a lot (one without). */
function firstQuantity(asked: number | undefined, typed: number | null, lot: number | null): number {
  if (asked !== undefined && Number.isFinite(asked) && asked > 0) return asked;
  if (typed !== null && (lot === null || typed % lot === 0)) return typed;
  return lot ?? 1;
}

/** One of a quantity's last digit: 0.1 for 0.5, 1 for a whole number or none. */
function lastDigitStep(quantity: number): number {
  const decimals = Number.isFinite(quantity) ? stepDecimals(quantity) : 0;
  return decimals > 0 ? Number((10 ** -decimals).toFixed(decimals)) : 1;
}
