---
"@tradecanvas/core": patch
---

Fix: a daily, weekly, monthly or yearly bar has no time-of-day component, but the time axis and the
crosshair time pill both formatted it as if it did — a bare `month/day` label (never the year) on
the axis, and a bare `month/day HH:MM` (always `00:00`) in the hover pill. Both now show the year
instead whenever a bar's time reads exactly midnight, which is what every daily-or-larger bar is
anchored to. Intraday bars (real time-of-day) are unaffected.

`@tradecanvas/commons`'s `timeParts()` now also returns `year`, and exports a new `isDateOnly()`
helper other callers can use for the same rule.
