---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: multi-timeframe moving average indicator

- New `mtfma` overlay indicator plots a moving average from a higher timeframe
  on the current chart (e.g. the daily 50-MA while viewing 1h bars). Base bars
  are grouped into higher-timeframe buckets and only *completed* HTF closes are
  averaged, so the line steps at each boundary and **never repaints**.
  Configurable `period` and `timeframe` (editable from the indicator settings
  dialog). Registered in the indicator menu and tested.
