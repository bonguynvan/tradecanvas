---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

`ChartWidget` takes a broker's rules for orders (`orderRules`, `widget.setOrderRules`): the kinds of order by the exchange's own names (HOSE: LO, ATO, ATC, MP), the times in force taken and the lot, over the market's preset. The exchange's name goes with the order as `exchangeType`, which `PaperExecutionAdapter` keeps.
