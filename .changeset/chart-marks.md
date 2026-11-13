---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Marks on the chart: `chart.setMarks`, `addMark`, `removeMark`, `getMarks` and `clearMarks` put headlines, earnings dates, dividends and splits on the bars they happened in, as badges at the foot of the price pane that the pointer reads and a click opens (`markHover`, `markClick`, `marksChange`; feature switch `marks`). ChartWidget marks the symbol's headlines from its news source by itself (`newsMarks: false` stops it).
