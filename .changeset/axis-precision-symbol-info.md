---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

The price scale writes its labels in the symbol's or market's price precision, as the legend and price tags already did, with its ticks on whole price steps (`minTick`). An adapter can send a `symbolInfo` event when it learns the symbol's details after the chart asked `resolveSymbol`; the chart applies them. `PollingAdapter`'s `emitEvent` is protected, for subclasses.
