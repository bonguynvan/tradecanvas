---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: session-segmented Market Profile (split mode)

- **`computeSessionProfiles(bars, priceMin, priceMax, opts)`** (core, pure) —
  splits bars into calendar-day sessions and returns a TPO profile per session,
  all sharing the same price window so they align on a common axis. Fully
  tested.
- **Split rendering**: `setMarketProfileConfig({ splitBySession: true })` draws
  one mini-histogram per session anchored under its bars (each with its own
  value area and POC line) instead of a single merged profile — the classic
  split-profile view. Toggle from the settings sheet ("MP split by session").
