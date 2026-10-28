---
'@tradecanvas/chart': patch
---

Stochastic RSI is named after all four of its lengths, "Stoch RSI 14 14 3 3", in the legend, the indicator chips, the Objects panel and the CSV and JSON export. It showed only three, so two instances that differed in the %D smoothing read the same. A column renamed: an export's Stochastic RSI columns are now `Stoch RSI 14 14 3 3 %K` and `Stoch RSI 14 14 3 3 %D` (they were `Stoch RSI 14 14 3 %K` and `Stoch RSI 14 14 3 %D`), so a script that reads them by name needs the new name.
