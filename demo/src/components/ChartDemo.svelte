<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { BinanceAdapter } from '@tradecanvas/chart';
  import { ChartWidget } from '@tradecanvas/chart/widget';
  import type { Chart, TradingPosition, TradingOrder } from '@tradecanvas/chart';
  import { SYMBOLS } from '../lib/chartConfig';
  import TradingPanel from './TradingPanel.svelte';
  import TradeToast from './TradeToast.svelte';

  let widgetHost: HTMLDivElement | undefined = $state();
  let widget: ChartWidget | null = null;
  let chart: Chart | null = $state(null);

  let currentSymbol = $state('BTCUSDT');
  let currentPrice = $state(0);
  let tradingPanel: TradingPanel | undefined = $state();
  let tradingOpen = $state(false);
  let positionCount = $state(0);
  let tradingTotalPnl = $state(0);

  let tradeToast: TradeToast | undefined = $state();

  $effect(() => {
    if (currentPrice && tradingPanel) {
      positionCount = tradingPanel.getPositionCount();
      tradingTotalPnl = tradingPanel.getTotalPnl();
    }
  });

  onMount(() => {
    if (!widgetHost) return;

    const adapter = new BinanceAdapter();

    widget = new ChartWidget(widgetHost, {
      symbol: 'BTCUSDT',
      timeframe: '5m',
      theme: 'dark',
      symbols: SYMBOLS.map((s) => s.value),
      adapter,
      historyLimit: 500,
      trading: true,
      onSymbolChange: (s) => {
        currentSymbol = s;
      },
      onReady: (c) => {
        chart = c;
        wireChartEvents(c);
      },
    });
  });

  onDestroy(() => {
    widget?.destroy();
    widget = null;
    chart = null;
  });

  function wireChartEvents(c: Chart): void {
    c.on('crosshairMove', (e: any) => {
      const bar = e.payload?.bar;
      if (bar && bar.close > 0) {
        currentPrice = bar.close;
        tradingPanel?.tick(bar.close);
      }
    });

    c.on('dataUpdate', () => {
      updateCurrentPriceFromLastBar(c);
      if (currentPrice > 0) tradingPanel?.tick(currentPrice);
    });

    c.on('orderModify', (e: any) => {
      const { orderId, newPrice } = e.payload ?? {};
      if (orderId && newPrice && tradingPanel) {
        tradingPanel.updateOrderPrice(orderId, newPrice);
      }
    });

    c.on('positionModify', (e: any) => {
      const { positionId, stopLoss, takeProfit } = e.payload ?? {};
      if (positionId && tradingPanel) {
        tradingPanel.updatePositionSlTp(positionId, stopLoss, takeProfit);
      }
    });

    c.on('orderPlace', (e: any) => {
      const intent = e.payload;
      if (!intent || !tradingPanel) return;
      const { side, type, price } = intent;
      if (type === 'market') {
        tradingPanel.openPositionAtPrice(side, price);
      } else {
        tradingPanel.placeOrderAtPrice(side, type, price);
      }
      syncTradingState();
    });
  }

  function updateCurrentPriceFromLastBar(c: Chart): void {
    try {
      const data = (c as any).dataManager?.getData();
      if (data && data.length > 0) {
        const last = data[data.length - 1];
        if (last.close > 0) currentPrice = last.close;
      }
    } catch {
      // ignore
    }
  }

  function handlePositionsChange(positions: TradingPosition[]): void {
    chart?.setPositions(positions);
  }

  function handleOrdersChange(orders: TradingOrder[]): void {
    chart?.setOrders(orders);
  }

  function handlePositionsChangeWrapped(pos: TradingPosition[]): void {
    handlePositionsChange(pos);
    syncTradingState();
  }

  function handleOrdersChangeWrapped(ord: TradingOrder[]): void {
    handleOrdersChange(ord);
    syncTradingState();
  }

  function syncTradingState(): void {
    if (tradingPanel) {
      positionCount = tradingPanel.getPositionCount();
      tradingTotalPnl = tradingPanel.getTotalPnl();
    }
  }

  function handleTradeToast(
    message: string,
    detail: string,
    type: 'fill-buy' | 'fill-sell' | 'sl' | 'tp',
  ): void {
    tradeToast?.addToast({ message, detail, type });
  }

  function toggleTrading(): void {
    tradingOpen = !tradingOpen;
  }
</script>

<section class="chart-section">
  <div class="chart-wrapper">
    <!-- Built-in widget: toolbar + drawing sidebar + status bar + settings -->
    <div class="widget-host" bind:this={widgetHost}></div>

    <!-- Floating trade toggle (built-in widget has no trade panel; this is demo-specific) -->
    <button
      type="button"
      class="trade-toggle"
      class:active={tradingOpen}
      onclick={toggleTrading}
      title="Trading panel"
    >
      <span class="trade-toggle-icon">$</span>
      <span class="trade-toggle-label">Trade</span>
      {#if positionCount > 0}
        <span class="trade-toggle-badge" class:profit={tradingTotalPnl >= 0} class:loss={tradingTotalPnl < 0}>
          {positionCount} · {tradingTotalPnl >= 0 ? '+' : ''}{tradingTotalPnl.toFixed(2)}
        </span>
      {/if}
    </button>

    <TradingPanel
      bind:this={tradingPanel}
      {currentPrice}
      symbol={currentSymbol}
      open={tradingOpen}
      onClose={() => { tradingOpen = false; }}
      onPositionsChange={handlePositionsChangeWrapped}
      onOrdersChange={handleOrdersChangeWrapped}
      onToast={handleTradeToast}
    />

    <TradeToast bind:this={tradeToast} />
  </div>
</section>

<style>
  .chart-section {
    padding: 0 24px 48px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .chart-wrapper {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--bg);
    position: relative;
    overflow: hidden;
  }

  .widget-host {
    width: 100%;
    height: 70vh;
    min-height: 480px;
    display: flex;
  }

  .widget-host :global(.tcw-root) {
    flex: 1;
    border: none;
    border-radius: 0;
  }

  .widget-host :global(.tcw-chart-container) {
    min-height: 0;
  }

  .trade-toggle {
    position: absolute;
    right: 16px;
    bottom: 44px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    z-index: 5;
    transition: background 0.15s, border-color 0.15s;
  }

  .trade-toggle:hover {
    background: var(--bg);
    border-color: var(--text-muted);
  }

  .trade-toggle.active {
    background: var(--accent, #2962ff);
    border-color: var(--accent, #2962ff);
    color: #fff;
  }

  .trade-toggle-icon {
    font-weight: 700;
  }

  .trade-toggle-badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.12);
  }

  .trade-toggle-badge.profit {
    color: var(--green, #26a69a);
  }

  .trade-toggle-badge.loss {
    color: var(--red, #ef5350);
  }

  @media (max-width: 768px) {
    .chart-section {
      padding: 0 12px 32px;
    }
    .widget-host {
      height: 60vh;
      min-height: 360px;
    }
    .trade-toggle {
      right: 12px;
      bottom: 40px;
      padding: 6px 10px;
    }
    .trade-toggle-label {
      display: none;
    }
  }
</style>
