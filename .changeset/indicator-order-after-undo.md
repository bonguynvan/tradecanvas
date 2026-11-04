---
"@tradecanvas/core": minor
"@tradecanvas/chart": patch
---

An undo, a redo and a loaded layout put the indicators back as they were. An indicator taken down and put back keeps its place in the list, so the legend, the order overlays are drawn in and a pane's stack no longer shift; a layout saved with an indicator before the pane's host loads in that order. An input the indicator didn't have (`period` on MACD, say) is taken back by an undo instead of staying. A drawing on a pane that another indicator took over goes back to its pane on undo when that pane held other indicators too, instead of landing on a pane that is gone. `IndicatorEngine.orderIndicators(ids)` puts the engine's indicators in a given order.
