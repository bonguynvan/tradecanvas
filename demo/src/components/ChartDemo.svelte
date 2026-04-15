<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    BinanceAdapter,
    DARK_THEME,
    LIGHT_THEME,
  } from '@tradecanvas/chart';
  import type { ChartType, DrawingToolType, TimeFrame, TradingPosition, TradingOrder } from '@tradecanvas/chart';
  import { SYMBOLS } from '../lib/chartConfig';
  import ChartToolbar from './ChartToolbar.svelte';
  import DrawToolsSidebar from './DrawToolsSidebar.svelte';
  import ChartSettings from './ChartSettings.svelte';
  import TradingPanel from './TradingPanel.svelte';
  import { DEFAULT_SETTINGS } from '../lib/chartSettings';
  import type { ChartSettingsState } from '../lib/chartSettings';

  let container: HTMLDivElement | undefined = $state();
  let chart: Chart | null = $state(null);

  // State
  let currentSymbol = $state('BTCUSDT');
  let currentTf: TimeFrame = $state('5m');
  let currentChartType: ChartType = $state('candlestick');
  let isDark = $state(true);
  let magnetEnabled = $state(true);
  let activeDrawingTool: DrawingToolType | null = $state(null);
  let activeIndicators: { instanceId: string; id: string; label: string }[] = $state([]);
  let symbolIndex = $state(0);

  // Trading state
  let currentPrice = $state(0);
  let replayState: 'playing' | 'paused' | 'stopped' = $state('stopped');
  let tradingPanel: TradingPanel | undefined = $state();
  let tradingOpen = $state(false);
  let positionCount = $state(0);
  let tradingTotalPnl = $state(0);

  // Context menu state

  // Connection status
  let statusState: 'connecting' | 'connected' | 'error' = $state('connecting');
  let statusMessage = $state('Connecting...');

  // Settings modal
  let settingsOpen = $state(false);
  let settings: ChartSettingsState = $state({ ...DEFAULT_SETTINGS });

  // Indicator instance map (indicatorId -> instanceId)
  const indicatorMap = new Map<string, string>();

  // Keep position count and PnL synced with trading panel
  $effect(() => {
    // Re-run whenever currentPrice changes to update PnL
    if (currentPrice && tradingPanel) {
      positionCount = tradingPanel.getPositionCount();
      tradingTotalPnl = tradingPanel.getTotalPnl();
    }
  });

  onMount(() => {
    if (!container) return;

    chart = new Chart(container, {
      chartType: 'candlestick',
      theme: DARK_THEME,
      autoScale: true,
      rightMargin: 5,
      crosshair: { mode: 'magnet' },
      watermark: {
        text: 'TradeCanvas',
        fontSize: 48,
        color: 'rgba(255,255,255,0.03)',
      },
      features: {
        drawings: true,
        drawingMagnet: true,
        drawingUndoRedo: true,
        indicators: true,
        trading: true,
        tradingContextMenu: true,
        volume: true,
        legend: true,
        crosshair: true,
        keyboard: true,
        screenshot: true,
        alerts: true,
        barCountdown: true,
        logScale: true,
        watermark: true,
      },
    });

    // Track current price from crosshair or periodic update
    chart.on('crosshairMove', (e: any) => {
      const bar = e.payload?.bar;
      if (bar && bar.close > 0) {
        currentPrice = bar.close;
      }
    });

    // Listen for data updates to keep current price fresh
    chart.on('dataUpdate', () => {
      updateCurrentPriceFromLastBar();
    });

    // Handle order drag events from chart
    chart.on('orderModify', (e: any) => {
      const { orderId, newPrice } = e.payload ?? {};
      if (orderId && newPrice && tradingPanel) {
        tradingPanel.updateOrderPrice(orderId, newPrice);
      }
    });

    // Handle position SL/TP drag events from chart
    chart.on('positionModify', (e: any) => {
      const { positionId, stopLoss, takeProfit } = e.payload ?? {};
      if (positionId && tradingPanel) {
        tradingPanel.updatePositionSlTp(positionId, stopLoss, takeProfit);
      }
    });

    // Handle built-in context menu order placement
    chart.on('orderPlace', (e: any) => {
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

    connectStream();
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });

  async function connectStream() {
    if (!chart) return;

    statusState = 'connecting';
    statusMessage = 'Connecting...';

    try {
      chart.disconnectStream();
      const adapter = new BinanceAdapter();
      await chart.connect({
        adapter,
        symbol: currentSymbol,
        timeframe: currentTf,
        historyLimit: 500,
      });

      chart.setWatermark(currentSymbol.replace('USDT', ' / USDT'), {
        fontSize: 48,
        color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      });

      statusState = 'connected';
      statusMessage = 'Live';

      // Sync trading state after connection
      updateCurrentPriceFromLastBar();
      if (tradingPanel) {
        chart.setPositions(tradingPanel.getPositions());
        chart.setOrders(tradingPanel.getOrders());
      }
    } catch (err: unknown) {
      statusState = 'error';
      statusMessage = err instanceof Error ? err.message : 'Connection failed';
    }
  }

  function handleSymbolClick() {
    symbolIndex = (symbolIndex + 1) % SYMBOLS.length;
    currentSymbol = SYMBOLS[symbolIndex].value;
    connectStream();
  }

  function handleTimeframe(tf: TimeFrame) {
    currentTf = tf;
    connectStream();
  }

  function handleChartType(type: ChartType) {
    currentChartType = type;
    chart?.setChartType(type);
  }

  function handleAddIndicator(indId: string) {
    if (!chart) return;

    if (indicatorMap.has(indId)) {
      // Toggle off
      const instanceId = indicatorMap.get(indId)!;
      chart.removeIndicator(instanceId);
      indicatorMap.delete(indId);
    } else {
      const instanceId = chart.addIndicator(indId);
      if (instanceId) {
        indicatorMap.set(indId, instanceId);
      }
    }

    activeIndicators = Array.from(indicatorMap.entries()).map(([id, instanceId]) => ({
      instanceId,
      id,
      label: id.toUpperCase(),
    }));
  }

  function handleRemoveIndicator(instanceId: string) {
    if (!chart) return;
    chart.removeIndicator(instanceId);

    for (const [id, iid] of indicatorMap.entries()) {
      if (iid === instanceId) {
        indicatorMap.delete(id);
        break;
      }
    }

    activeIndicators = Array.from(indicatorMap.entries()).map(([id, iid]) => ({
      instanceId: iid,
      id,
      label: id.toUpperCase(),
    }));
  }

  function handleDrawingTool(tool: DrawingToolType) {
    activeDrawingTool = tool;
    chart?.setDrawingTool(tool);
  }

  function handleCancelDrawing() {
    activeDrawingTool = null;
    chart?.setDrawingTool(null);
  }

  function handleToggleMagnet() {
    magnetEnabled = !magnetEnabled;
    chart?.setDrawingMagnet(magnetEnabled);
  }

  function handleUndo() {
    chart?.undo();
  }

  function handleRedo() {
    chart?.redo();
  }

  function handleClearDrawings() {
    chart?.clearDrawings();
    activeDrawingTool = null;
  }

  function handleScreenshot() {
    chart?.screenshot();
  }

  function handleToggleTheme() {
    isDark = !isDark;
    if (isDark) {
      document.body.classList.remove('light');
      chart?.setTheme(DARK_THEME);
    } else {
      document.body.classList.add('light');
      chart?.setTheme(LIGHT_THEME);
    }
    chart?.setWatermark(currentSymbol.replace('USDT', ' / USDT'), {
      fontSize: 48,
      color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    });
  }

  function handleSettingsChange(patch: Partial<ChartSettingsState>) {
    settings = { ...settings, ...patch };
    applySettings(patch);
  }

  function handleSettingsReset() {
    settings = { ...DEFAULT_SETTINGS };
    applySettings(settings);
  }

  function updateCurrentPriceFromLastBar(): void {
    if (!chart) return;
    try {
      const data = (chart as any).dataManager?.getData();
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

  function handleReplay(): void {
    if (!chart) return;
    const state = chart.getReplayState();
    if (state === 'paused') {
      chart.replayResume();
    } else {
      chart.replay({ speed: 1, startIndex: 0 });
    }
    replayState = chart.getReplayState();
  }

  function handleReplayPause(): void {
    if (!chart) return;
    chart.replayPause();
    replayState = chart.getReplayState();
  }

  function handleReplayStop(): void {
    if (!chart) return;
    chart.replayStop();
    replayState = chart.getReplayState();
  }

  function handleToggleTrading(): void {
    tradingOpen = !tradingOpen;
  }

  function handleTradingClose(): void {
    tradingOpen = false;
  }

  function syncTradingState(): void {
    if (tradingPanel) {
      positionCount = tradingPanel.getPositionCount();
      tradingTotalPnl = tradingPanel.getTotalPnl();
    }
  }

  function handlePositionsChangeWrapped(pos: TradingPosition[]): void {
    handlePositionsChange(pos);
    syncTradingState();
  }

  function handleOrdersChangeWrapped(ord: TradingOrder[]): void {
    handleOrdersChange(ord);
    syncTradingState();
  }

  function applySettings(patch: Partial<ChartSettingsState>) {
    if (!chart) return;

    if (patch.gridVisible !== undefined) chart.setGridVisible(patch.gridVisible);
    if (patch.volumeVisible !== undefined) chart.setVolumeVisible(patch.volumeVisible);
    if (patch.crosshairMode !== undefined) chart.setCrosshairMode(patch.crosshairMode);
    if (patch.autoScale !== undefined) chart.setAutoScale(patch.autoScale);
    if (patch.logScale !== undefined) chart.setLogScale(patch.logScale);

    // Apply theme colors
    const currentTheme = chart.getTheme();
    const themeUpdate: Record<string, unknown> = { ...currentTheme };
    if (patch.candleUpColor !== undefined) themeUpdate.candleUp = patch.candleUpColor;
    if (patch.candleDownColor !== undefined) themeUpdate.candleDown = patch.candleDownColor;
    if (patch.candleUpWick !== undefined) themeUpdate.candleUpWick = patch.candleUpWick;
    if (patch.candleDownWick !== undefined) themeUpdate.candleDownWick = patch.candleDownWick;
    if (patch.backgroundColor !== undefined) themeUpdate.background = patch.backgroundColor;
    if (patch.gridColor !== undefined) themeUpdate.grid = patch.gridColor;

    if (
      patch.candleUpColor !== undefined ||
      patch.candleDownColor !== undefined ||
      patch.candleUpWick !== undefined ||
      patch.candleDownWick !== undefined ||
      patch.backgroundColor !== undefined ||
      patch.gridColor !== undefined
    ) {
      chart.setTheme(themeUpdate as any);
    }
  }
</script>

<section class="chart-section">
  <div class="chart-wrapper">
    <ChartToolbar
      symbol={currentSymbol}
      activeTimeframe={currentTf}
      activeChartType={currentChartType}
      {activeIndicators}
      {isDark}
      onSymbolClick={handleSymbolClick}
      onTimeframe={handleTimeframe}
      onChartType={handleChartType}
      onAddIndicator={handleAddIndicator}
      onRemoveIndicator={handleRemoveIndicator}
      onScreenshot={handleScreenshot}
      onSettings={() => { settingsOpen = true; }}
      onToggleTheme={handleToggleTheme}
      {replayState}
      onReplay={handleReplay}
      onReplayPause={handleReplayPause}
      onReplayStop={handleReplayStop}
      {tradingOpen}
      onToggleTrading={handleToggleTrading}
      {positionCount}
      totalPnl={tradingTotalPnl}
    />

    <div class="chart-body">
      <DrawToolsSidebar
        activeTool={activeDrawingTool}
        {magnetEnabled}
        onDrawingTool={handleDrawingTool}
        onCancelDrawing={handleCancelDrawing}
        onToggleMagnet={handleToggleMagnet}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearDrawings={handleClearDrawings}
      />
      <div class="chart-container" bind:this={container}></div>
    </div>

    <TradingPanel
      bind:this={tradingPanel}
      {currentPrice}
      symbol={currentSymbol}
      open={tradingOpen}
      onClose={handleTradingClose}
      onPositionsChange={handlePositionsChangeWrapped}
      onOrdersChange={handleOrdersChangeWrapped}
    />

    <div class="chart-status">
      <div class="status-indicator">
        <span
          class="status-dot"
          class:connected={statusState === 'connected'}
          class:error={statusState === 'error'}
        ></span>
        <span>{statusMessage}</span>
      </div>
      <span>{currentSymbol} {currentTf}</span>
    </div>
  </div>
</section>

<ChartSettings
  open={settingsOpen}
  {settings}
  onClose={() => { settingsOpen = false; }}
  onChange={handleSettingsChange}
  onReset={handleSettingsReset}
/>

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
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .chart-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .chart-container {
    flex: 1;
    min-width: 0;
    height: 65vh;
    min-height: 450px;
    width: 100%;
  }

  .chart-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
    font-size: 11px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: background 0.3s;
  }

  .status-dot.connected {
    background: var(--green);
  }

  .status-dot.error {
    background: var(--red);
  }

  @media (max-width: 768px) {
    .chart-section {
      padding: 0 12px 32px;
    }
    .chart-container {
      height: 50vh;
      min-height: 350px;
    }
  }
</style>
