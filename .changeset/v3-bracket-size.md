---
'@tradecanvas/chart': major
'@tradecanvas/core': major
'@tradecanvas/commons': major
---

**Breaking:** with an execution adapter connected, a confirmed bracket now goes to it as one order when `brackets` is left out (`'place'`), where it stayed the `bracketPlace` event with a warning in the console. An app that places the event's bracket itself connects with `connectExecution(adapter, { brackets: 'event' })`.

A bracket has a size: `chart.startBracket(side, entry, size)` takes `{ quantity }`, or `{ risk, quantityStep, multiplier }` for the quantity that loses `risk` at the stop, which follows the lines as they are dragged. The quantity is written on the entry's tag and sent with `bracketPlace`. With an adapter that places brackets, `confirmBracket()` does not confirm one with no quantity: it returns false, `executionError` says why (`reason: 'noQuantity'`), and the bracket stays to be given a size. `chart.setBracketSize(size)` and `chart.getBracket()` change and read the bracket being placed, and `bracketQuantity(bracket, size)` is the sum on its own. The widget's bracket bar has a quantity field (the quantity last typed, else the market's lot), and `widget.startBracket(side, size)` takes a size.
