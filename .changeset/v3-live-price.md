---
'@tradecanvas/chart': minor
---

`ChartWidget` knows when its price is no longer live: its feed not connected, or connected and telling nothing for longer than `feedQuietAfter` (seconds, 60). The status bar then says so in place of "Live" and the ticket sends no market order; with the feed not connected, an order asked for in one press and a bracket or a draft confirmed are held back with a note (`chart.setOrderGate`). `chart.getFeedTime()` is when the stream last told anything.
