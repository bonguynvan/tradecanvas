---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Drawings go on indicator panes. A drawing begun on an RSI or MACD pane is made there, on the pane's scale: its anchors' prices are the pane's values, the magnet snaps to the pane's lines, and it moves, scales and is clipped with the pane. `DrawingState.paneId` names the pane (an id from `getIndicatorPanes()`; unset is the price pane, so saved layouts are unchanged), and `addDrawing({ …, paneId })` puts one there from code. When another indicator takes a pane over, its drawings follow, through undo and redo too; when a pane goes, its drawings are hidden until undo brings it back; a loaded layout puts them back on their panes and drops those whose pane it doesn't have. Side and folded panes take none, the tools that read the bars' prices (`priceOnly` in a tool's descriptor: Anchored VWAP, Volume Profile, Long/Short Position) stay on the price pane, and a pane's drawing takes no price alert. `IndicatorEngine.getPaneValuesAt(pane, bar)` gives the values a pane draws at a bar.
