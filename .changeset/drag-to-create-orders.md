---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Add drag-to-create orders. `chart.startOrderDraft(side, price?)` begins a draggable single-order line at a price level (default: the latest close); drag it to a level and `confirmOrderDraft()` emits an `orderPlace` intent — which a connected `ExecutionAdapter` then fills. The order type (limit vs stop) is inferred from the level relative to the current price. `cancelOrderDraft()` and `isOrderDraftActive()` round out the API.

The geometry and state live in a pure, testable `OrderDraftTool` (mirrors `BracketTool`), exported from `@tradecanvas/core` along with `inferOrderType`.
