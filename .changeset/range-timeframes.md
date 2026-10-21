---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Long ranges show all of their span: in the widget a range on the range bar that the bars can't fit switches to the timeframe that can (5Y of days to weeks, All to months, 2 px a bar or more) and a short one goes back to the timeframe the user picked; `features['statusBar.rangeTimeframe']` turns it off. On a bare chart, `minBarUnit` (an option, or `setMinBarUnit`) lets bar slots go from 0.25 px down to 0.02 px so `fitContent` and the 'All' range fit a long series.
