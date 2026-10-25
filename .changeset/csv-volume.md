---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Exported CSV and JSON no longer show float dust. A volume summed from trades or smaller bars, a price or an indicator value could be written as `40.370000000000005` or `0.30000000000000004`, which is how the computer adds the decimals, not what the feed sent. `chart.exportAllData`, `chart.exportVisibleData`, `chart.getExportText` and the widget's **Export data (CSV)** now write a number with a fraction to 15 significant digits (`40.37`, `0.3`), which keeps every digit of a number up to 15 significant digits (a 16th decimal, as in `12345678.12345678`, is cut), and leave whole numbers and numbers from 1e15 up as they are, however long. A value that is no number (`NaN`) is an empty cell in the CSV, as a missing indicator value already was, and `null` in the JSON.
