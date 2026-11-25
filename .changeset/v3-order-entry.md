---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

The order ticket offers good till a date (GTD) for a limit and a stop order: a date and a time on the chart's clock, sent as `expireTime`, counted from `chart.getTradingTime()` (a replay's clock while a paper account trades on it). An IOC or FOK limit may be priced through the market, and is summed up from the market it fills at. A fill that drops the rest of its order says how much in `dropped`; the activity log writes it as cancelled and the widget says how much filled. The widget says when the adapter refused an order; one toast shows at a time, and a long one wraps. While a line is dragged to a price the crosshair draws no horizontal line and no price beside it.
