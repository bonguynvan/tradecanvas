---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A tape, and the trades themselves. `chart.followTrades()` follows the trades of the chart's symbol until the function it returns is called: the feed's recent trades, then its live ones, as `trades` events; trades given with `chart.addTrades()` are told the same way, and no trade of the feed's is told twice. In the widget, `tape: true` adds the tape (time and sales) to the dock: the trades newest on top, each with its time, price and size in the colour of who took it, how the rows split between buyers and sellers over them, a large trade standing out, and a least size under which trades are left out. `MockAdapter` tells its bars' trades in whole sizes, and still tells them once it streams.
