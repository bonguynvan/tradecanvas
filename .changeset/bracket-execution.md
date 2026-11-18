---
'@tradecanvas/commons': minor
'@tradecanvas/chart': minor
---

A confirmed bracket can go to the execution adapter. `chart.connectExecution(adapter, { brackets: 'place' })` sends it as one order with `placeOrder`:
- the entry, a limit or a stop against the price;
- its quantity;
- its stop-loss and take-profit.

The chart then sends `bracketOrder` (`{ order, bracket }`) once the adapter took it, or `executionError` with the new `command: 'bracketPlace'` field. Some brackets are not sent: one with no quantity, since no one saw a size to place, and one confirmed before the chart has a price to tell a limit entry from a stop. `executionError` gives the new `reason` (`'noQuantity'`, `'noPrice'`). The brackets that the toolbar and `startBracket` start have no quantity yet, so they are not sent. `chart.placesBrackets()` says whether it does. Without `brackets`, a bracket stays the `bracketPlace` event as before, and the chart warns once in the console when one is confirmed with an adapter connected. `'place'` becomes the default in the next major version, so an app that places the event's bracket itself passes `brackets: 'event'`.

The widget no longer says a bracket was "placed" when it only went out as the event. It says it was confirmed, says "placed" once the adapter took it, and says why one was not placed.
