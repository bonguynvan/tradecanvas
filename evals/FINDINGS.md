# Findings

What writing and running the evals turned up about the library, for the
fixes that follow. Each says where it showed and what an agent (or a person)
runs into.

## From writing the graders

1. **No `getChartType()`.** `setChartType` has no getter; the chart's type reads
   back only from `saveState()`. An agent checking its work, or a host keeping
   a toolbar in step, has to guess. (Task 01.)
2. **A live price from `updateLastBar` or `appendBar` fires no alert.** Alerts
   and the orders' current price follow `setCurrentPrice` and a connected
   stream only. The skill teaches `updateLastBar` for live feeds, so alerts
   set on a chart fed by hand never go off, and nothing says why. (Task 07:
   its reference calls `setCurrentPrice` beside `updateLastBar`.)
3. **`dataUpdate` is not what the docs say.** The event table gives its payload
   as "the series"; it carries `{ length }`, `{ alert, … }`, `{ connection }`
   or `{ error }` depending on who sent it, and `updateLastBar` / `appendBar`
   don't send it at all. An agent listening for new bars hears nothing.
4. **Time zone, four spellings.** The option is `timeZone`, the methods
   `setTimezone` / `getTimezone` / `getEffectiveTimezone`, `SymbolInfo` has
   `timezone`, `MarketConfig` has `timeZone`. Writing the reference, the
   option went in as `timezone` (from the methods' name) and failed the type
   check. (Task 10.)
5. **A market's zone isn't the chart's.** `MARKET_HOSE` carries
   `timeZone: 'Asia/Ho_Chi_Minh'`, but `setMarket(MARKET_HOSE)` leaves the
   axis in the browser's zone; the zone has to be set again. (Task 10.)
