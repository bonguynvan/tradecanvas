---
'@tradecanvas/commons': minor
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A position keeps what its price was worth when it opened (`TradingPosition.multiplier`, set by the paper account): a chart shown another market or another symbol no longer revalues open positions, books their profit at the wrong scale or calls them for margin. The chart hands an adapter what a price is worth on its market beside each order, a confirmed bracket's too (`placeOrder(intent, context)`, the new `OrderContext`), read as the order leaves: orders sent in one turn, or from charts sharing an account, are each counted at their own. The order itself is as it was, with nothing added to what a broker is sent. `ExecutionAdapter.setMultiplier(multiplier, symbol?)` is told the symbol. The account panel and the chart's tags count each position by its own multiplier. The paper account's positions carry `multiplier` in `getPositions()` and the `positions` event once a chart is connected. Its stop-out closes the position that loses the most money, and a market traded in lots refuses a part of a share in the order ticket.
