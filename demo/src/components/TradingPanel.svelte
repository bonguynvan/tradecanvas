<script lang="ts">
  import type { TradingPosition, TradingOrder, OrderSide } from '@tradecanvas/chart';
  import { X, RefreshCw } from 'lucide-svelte';

  const STORAGE_BALANCE = 'tc-demo-balance';
  const STORAGE_POSITIONS = 'tc-demo-positions';
  const STORAGE_ORDERS = 'tc-demo-orders';
  const INITIAL_BALANCE = 10000;

  interface Props {
    currentPrice: number;
    symbol: string;
    open: boolean;
    onClose: () => void;
    onPositionsChange: (positions: TradingPosition[]) => void;
    onOrdersChange: (orders: TradingOrder[]) => void;
  }

  let { currentPrice, symbol, open, onClose, onPositionsChange, onOrdersChange }: Props = $props();
  let balance = $state(INITIAL_BALANCE);
  let positions: TradingPosition[] = $state([]);
  let orders: TradingOrder[] = $state([]);
  let nextId = $state(1);

  // Load from localStorage on init
  function loadState(): void {
    try {
      const savedBalance = localStorage.getItem(STORAGE_BALANCE);
      if (savedBalance !== null) balance = parseFloat(savedBalance);

      const savedPositions = localStorage.getItem(STORAGE_POSITIONS);
      if (savedPositions) positions = JSON.parse(savedPositions);

      const savedOrders = localStorage.getItem(STORAGE_ORDERS);
      if (savedOrders) orders = JSON.parse(savedOrders);

      const maxPosId = positions.reduce((m, p) => Math.max(m, parseInt(p.id.replace('tc-pos-', ''), 10) || 0), 0);
      const maxOrdId = orders.reduce((m, o) => Math.max(m, parseInt(o.id.replace('tc-ord-', ''), 10) || 0), 0);
      nextId = Math.max(maxPosId, maxOrdId) + 1;
    } catch {
      // ignore parse errors
    }
  }

  loadState();

  function saveState(): void {
    localStorage.setItem(STORAGE_BALANCE, String(balance));
    localStorage.setItem(STORAGE_POSITIONS, JSON.stringify(positions));
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
  }

  function getDefaultQuantity(sym: string): number {
    const base = sym.replace('USDT', '');
    switch (base) {
      case 'BTC': return 0.1;
      case 'ETH': return 1.0;
      case 'SOL': return 10;
      case 'BNB': return 1;
      default: return 1;
    }
  }

  function generateId(prefix: string): string {
    const id = `${prefix}-${nextId}`;
    nextId += 1;
    return id;
  }

  function openPosition(side: OrderSide): void {
    if (currentPrice <= 0) return;
    const qty = getDefaultQuantity(symbol);
    const slMultiplier = side === 'buy' ? 0.98 : 1.02;
    const tpMultiplier = side === 'buy' ? 1.04 : 0.96;

    const newPos: TradingPosition = {
      id: generateId('tc-pos'),
      side,
      entryPrice: currentPrice,
      quantity: qty,
      stopLoss: parseFloat((currentPrice * slMultiplier).toFixed(2)),
      takeProfit: parseFloat((currentPrice * tpMultiplier).toFixed(2)),
    };

    positions = [...positions, newPos];
    saveState();
    onPositionsChange(positions);
  }

  function placeLimitOrder(side: OrderSide): void {
    if (currentPrice <= 0) return;
    const qty = getDefaultQuantity(symbol);
    const priceMultiplier = side === 'buy' ? 0.99 : 1.01;

    const newOrder: TradingOrder = {
      id: generateId('tc-ord'),
      side,
      type: 'limit',
      price: parseFloat((currentPrice * priceMultiplier).toFixed(2)),
      quantity: qty,
      label: 'LIMIT',
      draggable: true,
    };

    orders = [...orders, newOrder];
    saveState();
    onOrdersChange(orders);
  }

  function closePosition(posId: string): void {
    const pos = positions.find(p => p.id === posId);
    if (pos) {
      const pnl = computePnl(pos);
      balance = parseFloat((balance + pnl).toFixed(2));
    }
    positions = positions.filter(p => p.id !== posId);
    saveState();
    onPositionsChange(positions);
  }

  function cancelOrder(ordId: string): void {
    orders = orders.filter(o => o.id !== ordId);
    saveState();
    onOrdersChange(orders);
  }

  function resetAll(): void {
    balance = INITIAL_BALANCE;
    positions = [];
    orders = [];
    nextId = 1;
    saveState();
    onPositionsChange(positions);
    onOrdersChange(orders);
  }

  function computePnl(pos: TradingPosition): number {
    if (currentPrice <= 0) return 0;
    return pos.side === 'buy'
      ? (currentPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - currentPrice) * pos.quantity;
  }

  function computePnlPercent(pos: TradingPosition): number {
    if (pos.entryPrice <= 0) return 0;
    const raw = pos.side === 'buy'
      ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;
    return raw;
  }

  const totalPnl = $derived(
    positions.reduce((sum, p) => sum + computePnl(p), 0)
  );

  const totalPnlPercent = $derived(
    balance > 0 ? (totalPnl / INITIAL_BALANCE) * 100 : 0
  );

  function formatUsd(v: number): string {
    const sign = v >= 0 ? '+' : '';
    return `${sign}$${v.toFixed(2)}`;
  }

  function formatPercent(v: number): string {
    const sign = v >= 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}%`;
  }

  function formatPrice(v: number): string {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Public method-like: update an order price (called from parent on orderModify event)
  export function updateOrderPrice(orderId: string, newPrice: number): void {
    orders = orders.map(o => o.id === orderId ? { ...o, price: newPrice } : o);
    saveState();
    onOrdersChange(orders);
  }

  // Public method: update position SL/TP (called from parent on positionModify event)
  export function updatePositionSlTp(positionId: string, stopLoss?: number, takeProfit?: number): void {
    positions = positions.map(p => {
      if (p.id !== positionId) return p;
      return {
        ...p,
        ...(stopLoss !== undefined ? { stopLoss } : {}),
        ...(takeProfit !== undefined ? { takeProfit } : {}),
      };
    });
    saveState();
    onPositionsChange(positions);
  }

  // Expose current state for parent to call setPositions/setOrders on mount
  export function getPositions(): TradingPosition[] { return positions; }
  export function getOrders(): TradingOrder[] { return orders; }
  export function getPositionCount(): number { return positions.length; }
  export function getTotalPnl(): number { return totalPnl; }

  // Open a position at a specific price (used by context menu)
  export function openPositionAtPrice(side: OrderSide, atPrice: number): void {
    if (atPrice <= 0) return;
    const qty = getDefaultQuantity(symbol);
    const slMultiplier = side === 'buy' ? 0.98 : 1.02;
    const tpMultiplier = side === 'buy' ? 1.04 : 0.96;

    const newPos: TradingPosition = {
      id: generateId('tc-pos'),
      side,
      entryPrice: atPrice,
      quantity: qty,
      stopLoss: parseFloat((atPrice * slMultiplier).toFixed(2)),
      takeProfit: parseFloat((atPrice * tpMultiplier).toFixed(2)),
    };

    positions = [...positions, newPos];
    saveState();
    onPositionsChange(positions);
  }

  // Place a limit order at a specific price (used by context menu)
  export function placeLimitOrderAtPrice(side: OrderSide, atPrice: number): void {
    if (atPrice <= 0) return;
    const qty = getDefaultQuantity(symbol);

    const newOrder: TradingOrder = {
      id: generateId('tc-ord'),
      side,
      type: 'limit',
      price: atPrice,
      quantity: qty,
      label: 'LIMIT',
      draggable: true,
    };

    orders = [...orders, newOrder];
    saveState();
    onOrdersChange(orders);
  }
</script>

{#if open}
  <div class="trading-popup">
    <div class="popup-header">
      <div class="header-left">
        <span class="header-title">Paper Trading</span>
        <span class="header-balance">${formatPrice(balance)}</span>
      </div>
      <button class="btn-close-popup" title="Close" onclick={onClose}>
        <X size={14} />
      </button>
    </div>
    {#if totalPnl !== 0}
      <div class="popup-pnl" class:profit={totalPnl >= 0} class:loss={totalPnl < 0}>
        PnL: {formatUsd(totalPnl)} ({formatPercent(totalPnlPercent)})
      </div>
    {/if}

    <div class="trading-content">
      <div class="trading-actions">
        <div class="action-group">
          <button class="btn-buy" onclick={() => openPosition('buy')}>Buy / Long</button>
          <button class="btn-limit-buy" onclick={() => placeLimitOrder('buy')}>Limit</button>
        </div>
        <div class="action-group">
          <button class="btn-sell" onclick={() => openPosition('sell')}>Sell / Short</button>
          <button class="btn-limit-sell" onclick={() => placeLimitOrder('sell')}>Limit</button>
        </div>
        <div class="action-group action-right">
          <span class="current-price">{formatPrice(currentPrice)}</span>
          <button class="btn-reset" title="Reset all" onclick={resetAll}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {#if positions.length > 0}
        <div class="section-label">Positions</div>
        <div class="list">
          {#each positions as pos (pos.id)}
            {@const pnl = computePnl(pos)}
            {@const pnlPct = computePnlPercent(pos)}
            <div class="row">
              <span class="side-tag" class:buy={pos.side === 'buy'} class:sell={pos.side === 'sell'}>
                {pos.side === 'buy' ? 'LONG' : 'SHORT'}
              </span>
              <span class="mono">{pos.quantity}</span>
              <span class="dim">@</span>
              <span class="mono">{formatPrice(pos.entryPrice)}</span>
              <span class="spacer"></span>
              <span class="pnl-val" class:profit={pnl >= 0} class:loss={pnl < 0}>
                {formatUsd(pnl)} ({formatPercent(pnlPct)})
              </span>
              <button class="btn-close" title="Close position" onclick={() => closePosition(pos.id)}>
                <X size={10} />
              </button>
            </div>
          {/each}
        </div>
      {/if}

      {#if orders.length > 0}
        <div class="section-label">Orders</div>
        <div class="list">
          {#each orders as ord (ord.id)}
            <div class="row">
              <span class="side-tag" class:buy={ord.side === 'buy'} class:sell={ord.side === 'sell'}>
                {ord.side === 'buy' ? 'BUY' : 'SELL'}
              </span>
              <span class="order-type">{ord.type.toUpperCase()}</span>
              <span class="mono">{ord.quantity}</span>
              <span class="dim">@</span>
              <span class="mono">{formatPrice(ord.price)}</span>
              <span class="spacer"></span>
              <button class="btn-cancel" onclick={() => cancelOrder(ord.id)}>Cancel</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .trading-popup {
    position: absolute;
    top: 44px;
    right: 8px;
    width: 360px;
    max-height: 400px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .header-balance {
    font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    color: var(--text-muted);
  }

  .btn-close-popup {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
  }

  .btn-close-popup:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }

  :global(body.light) .btn-close-popup:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .popup-pnl {
    padding: 4px 12px;
    font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .popup-pnl.profit { color: var(--green); }
  .popup-pnl.loss { color: var(--red); }

  .trading-content {
    padding: 8px 12px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .trading-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .action-group {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .action-right {
    margin-left: auto;
    gap: 8px;
  }

  .current-price {
    font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    color: var(--text-muted);
  }

  .btn-buy {
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 600;
    font-family: inherit;
    border: none;
    border-radius: 4px;
    background: var(--green);
    color: white;
    cursor: pointer;
    transition: opacity var(--transition);
  }
  .btn-buy:hover { opacity: 0.85; }

  .btn-sell {
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 600;
    font-family: inherit;
    border: none;
    border-radius: 4px;
    background: var(--red);
    color: white;
    cursor: pointer;
    transition: opacity var(--transition);
  }
  .btn-sell:hover { opacity: 0.85; }

  .btn-limit-buy,
  .btn-limit-sell {
    padding: 3px 8px;
    font-size: 10px;
    font-family: inherit;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all var(--transition);
  }
  .btn-limit-buy:hover { border-color: var(--green); color: var(--green); }
  .btn-limit-sell:hover { border-color: var(--red); color: var(--red); }

  .btn-reset {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
  }
  .btn-reset:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }
  :global(body.light) .btn-reset:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .section-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 2px;
    margin-top: 4px;
  }

  .list {
    display: flex;
    flex-direction: column;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
    font-size: 11px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    transition: background var(--transition);
  }

  .row:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  :global(body.light) .row {
    border-bottom-color: rgba(0, 0, 0, 0.04);
  }

  :global(body.light) .row:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  .side-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    letter-spacing: 0.02em;
  }
  .side-tag.buy {
    color: var(--green);
    background: rgba(16, 185, 129, 0.12);
  }
  .side-tag.sell {
    color: var(--red);
    background: rgba(239, 68, 68, 0.12);
  }

  .order-type {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .mono {
    font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    color: var(--text);
  }

  .dim {
    color: var(--text-muted);
  }

  .spacer {
    flex: 1;
  }

  .pnl-val {
    font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    font-weight: 500;
  }
  .pnl-val.profit { color: var(--green); }
  .pnl-val.loss { color: var(--red); }

  .btn-close {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
  }
  .btn-close:hover {
    background: rgba(239, 68, 68, 0.15);
    color: var(--red);
  }

  .btn-cancel {
    padding: 2px 8px;
    font-size: 10px;
    font-family: inherit;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all var(--transition);
  }
  .btn-cancel:hover {
    border-color: var(--red);
    color: var(--red);
  }
</style>
