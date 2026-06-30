---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

First-class resizable panes. Drag the divider between the main chart and an indicator pane (or between panes) to resize it — `ns-resize` cursor on hover, working with both mouse and touch. Each pane keeps its own independent price scale. The geometry lives in a pure, testable `PaneResizeHandler`.

Also fixes `chart.setPanelSize()`, which previously only requested a render without re-resolving the layout (so the pane didn't actually resize); it now performs a full relayout.
