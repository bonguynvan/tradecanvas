---
'@tradecanvas/core': minor
'@tradecanvas/chart': patch
---

Measuring tools, positions and profiles read cleaner. A price range is tinted and edged in the rise or fall colour with an arrow and its change on a tag; a date range has an arrow and its bars and time on a tag, its handles halfway up the plot (as Fibonacci time zones' and cyclic lines' now are); a date and price range draws its arrow heads; a measure drops "Price:" and "Bars:", and a measure too short for its arrow head leaves it off. A price range keeps a colour picked for it. Rises and falls take the theme's `trading.profitColor` and `trading.lossColor`, green and red without them (price ranges, Long/Short positions, forecasts). A bars pattern marks the bars it copies with a band instead of a line across the price, and draws its copy sharp. A volume profile draws its histogram inside its range with the range outlined and the value area shaded, and its handles, like an anchored VWAP's, sit where its lines are, not at prices that mean nothing to it. `Chart.getDrawingRect` takes in a drawing's tags and handles, so the widget's floating toolbar keeps clear of them, and a position's entry tag sits past its handle.
