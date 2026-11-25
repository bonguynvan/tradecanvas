---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

A symbol whose session runs past midnight (`sessions: [{ start: '17:00', end: '16:00' }]`) starts its trading day at the session's open: Session VWAP, VWAP's and Volume Delta's anchors, the session volume profile, the MTF average's days, the prior-day lines and the market profile's days no longer cut the session in two. `tradingDayStart(sessions)` gives the minute.
