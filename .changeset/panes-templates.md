---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Panes, indicator templates and undo.**

- **Move indicators between panes**: `chart.moveIndicatorToPane(id, target)`
  into another indicator's pane, a pane of its own (`'new'`) or the price
  pane (`'price'`); `canMoveIndicatorToPane`. A pane's other indicators stay
  (one takes the pane over) or follow when they read its lines. ChartWidget:
  a ⋯ button on each legend row.
- **Fold, maximise and reorder panes**: `setPaneCollapsed`, `setMaximizedPane`,
  `movePane`, the `paneChange` event; ChartWidget puts buttons at each pane's
  top right. Saved layouts keep each pane's size, order, fold and maximise
  (`SnapshotIndicator.paneSize`, `paneOrder`, `paneCollapsed`, `paneMaximized`).
- **Undo for indicators**: adding, removing, editing and moving indicators are
  steps in the drawings' history; an undone indicator comes back under its own
  id; a burst of edits to one indicator is one step; a loaded layout starts a
  fresh history. `UndoableAction` has an `'indicators'` type.
- **Indicator templates** in ChartWidget (`indicatorTemplates`, on by default),
  built on `chart.getIndicatorSetup()` / `applyIndicatorSetup()`.
- **Type an interval**: a number typed on the chart opens a field (`5`, `15m`,
  `1h`, `1D`, Enter) — `intervalTyping`, on by default. **Alt+T / H / J / V /
  C / F** pick the trend line, horizontal line and ray, vertical line, cross
  line and Fibonacci retracement.
- `chart.roundPrice(price)` puts a price on the market's grid (`minTick`);
  ChartWidget's menus and order ticket use it.
