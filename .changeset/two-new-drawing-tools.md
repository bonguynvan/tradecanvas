---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Second increment of TradingView Advanced Charts drawing-tool parity:

- `horizontalRay` — like `horizontalLine`, but only extends forward in time
  from the anchor instead of spanning the full chart width.
- `riskReward` — TradingView's "Long/Short Position" tool: drag from an
  entry price to a stop price and it draws the risk zone plus a reward zone
  (2:1 by default) on the far side, with direction inferred automatically
  and $/% labels at each level.

Both tools are wired into the demo and `ChartWidget` drawing toolbars (new
"Position" group) and object-tree labels, not just the headless API.

Corrects the stale "24 drawing tools" figure to 26 everywhere it's a live
(non-changelog) figure.
