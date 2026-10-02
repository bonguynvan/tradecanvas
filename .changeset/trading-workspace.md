---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Trading and workspace.**

- **Act on orders and positions from the chart.**
  - Order and position lines carry buttons: × cancels an order or closes a
    position, ⇅ reverses a position, × on a stop-loss or take-profit removes
    it (`TradingConfig.lineButtons`).
  - New `positionReverse` intent and `ExecutionAdapter.reversePosition`;
    without it the chart closes and sends a market order the other way.
    `chart.cancelOrderIntent`, `closePositionIntent`, `reversePositionIntent`,
    `modifyPositionIntent` (a `null` stop removes it).
  - **Adapters:** `PositionModifyIntent.stopLoss` / `takeProfit` may now be
    `null`, meaning remove it; a missing field still means keep it. An
    adapter written as `intent.stopLoss ?? position.stopLoss` would keep a
    stop the user removed.
  - Orders take `stopLoss`, `takeProfit` and `timeInForce` (`'gtc'` |
    `'day'`), carried to the position they open. `PaperExecutionAdapter`
    fills stops and targets and reverses.
- **Fills on the chart**: a mark per fill on its bar (solid opening, hollow
  closing; `TradingConfig.fillMarks`). `FillEvent` has `reason`
  (`order`, `close`, `reverse`, `stopLoss`, `takeProfit`), `pnl` and
  `positionId`; the chart emits `executionFill` and keeps the latest 1000
  (`getFills`, `addFill`, `clearFills`; `getRealisedPnl` sums them all).
- The buttons on the lines act on release over them; a press that slides off
  does nothing.
- **Right-click areas and a "+" by the price axis**: `chartContextMenu`
  says which part was clicked (plot, pane, price axis, time axis) with the
  price and time there; `features.priceAxisAddButton` shows a "+" level with
  the crosshair that emits `priceAxisAdd`.
- **Events**: `ordersChange`, `positionsChange`, and `stateChange` when
  something a saved layout holds may have changed. `setChartType` and
  `setTheme` now schedule an auto-save too.
- **ChartWidget menus**: the plot offers an alert, a buy and a sell at the
  price (a limit where it would wait, else a stop), an order ticket, a
  horizontal line, reset view and the drawings; the price axis its scale
  switches; the time axis reset view and go to date. `chartMenuItems` adds
  the host's own entries.
- **Order ticket and account panel** (`accountPanel`, on with trading):
  positions with their P&L, working orders and fills with close, reverse and
  cancel; a ticket with side, type, quantity, price, stop-loss, take-profit
  and time in force, checked as it is filled in, with the reward:risk.
- **Named layouts** (`layouts`, on by default): save the chart under a name,
  open, rename and delete, auto-save the one open, Ctrl/Cmd+S. Storage is
  pluggable (`LayoutStorage`: `localStorageLayouts`, `memoryLayouts`, or the
  host's server); `LayoutSession` runs it. `widget.getLayoutContent()` /
  `applyLayoutContent()` give the content alone.
- **ChartWidgetGrid**: up to six chart widgets side by side with a bar to pick
  the arrangement, link symbol, interval, crosshair, time and drawings, and
  save the whole grid as a named layout. `adapter: () => …` gives each chart
  its own feed, `onChartAdd` sees each chart made, and charts the grid shrinks
  from come back as they were.
- **`ChartGrid.connectAll`** takes a function that makes an adapter per chart:
  an adapter keeps one stream, so one adapter object shared by every chart
  sent each of them the last symbol's bars.
- Layouts record their `kind` (`'chart'` or `'grid'`), so both can share one
  storage; saving, opening and auto-saving run one at a time.
- `widget.toggleAccountPanel()`, `getSymbol()`, `getTimeframe()`.
- **`widget.addToolbarButton()`** for the host's own toolbar buttons (icon or
  element, text, a switch).
- With several widgets on a page, Ctrl/Cmd+K and +P go to the one used last.
