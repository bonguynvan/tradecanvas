---
'@tradecanvas/chart': patch
---

feat: trade-from-depth ladder (DOM)

- A toolbar ladder button opens a depth-of-market panel rendering the order
  book as price rows with bid/ask size columns and depth bars. **Click an ask
  cell to buy, a bid cell to sell** at that price — each click emits an
  `orderPlace` intent (the chart never trades itself, matching the host-owned
  model). Opt in with `depthLadder: true`; feed the book via the new
  `widget.setDepth(data)`, which also drives the on-chart depth overlay.
- New `chart.placeOrderIntent()` to emit an order intent programmatically, and
  a pure, tested `buildLadderRows()` that merges bids/asks into a high→low
  ladder model with mid-price and bar scaling.
