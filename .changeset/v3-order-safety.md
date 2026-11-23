---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The order ticket trades a Buy at the ask and a Sell at the bid where the feed gives both, waits for the execution adapter's answer (a second press sends nothing, and a refused order keeps what was typed and says why), and no longer shuts on a press outside it. Every order asked for goes out with a `clientOrderId`, `placeOrderIntent` returns the order as sent, and the new `orderPlaced` event says an adapter took it. An order from the right-click menu or the depth ladder is for the market's lot.
