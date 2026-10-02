---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

- **Crosshair tooltip date follows the chart locale**: the month name is formatted with the chart's number locale (e.g. `vi-VN` shows "1 thg 10 · 05:00" instead of "Oct 1 · 05:00"), the same locale the session-break labels use. `formatTooltipTime` takes the locale as an optional fourth argument; an unknown locale tag falls back to English.
- **No seconds on minute-or-longer bars with second timestamps**: the bar spacing passed to the tooltip was in the series' own unit, so a 1h series with timestamps in seconds looked like sub-minute bars and showed `05:00:00`. New `barTimeStepMs()` reports the spacing in milliseconds for either unit.
- **Time axis**: the last tick label no longer draws over the timezone tag at the bottom-right (they read as "UTC10/2"); a label that would reach the tag is left out, as on the price axis.
