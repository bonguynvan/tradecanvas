---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

`positionLevels(drawing)` reads a Long/Short Position drawing as a trade: its side (`'buy'` for a long), entry, stop-loss, take-profit, and the quantity its risk buys, unrounded, with the decimals the drawing writes it in, the money at risk and to gain, and the R:R. It gives `null` for any other drawing, for a position whose stop is still on its entry, for one with no risk set, and for prices that are not finite, so a result is always an order that can be placed. An app that places an order from the drawing gets the numbers its tags show, without working them out from the anchors and options again. The `PositionLevels` type is exported with it.
