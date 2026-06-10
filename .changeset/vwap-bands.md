---
'@tradecanvas/core': patch
---

feat: standard-deviation bands on Session VWAP

- The `svwap` indicator gains volume-weighted standard-deviation bands: set
  `bands: 1–3` to draw ±1σ…±3σ envelopes around the session VWAP (dashed,
  session-aware), the classic VWAP band read for mean-reversion. Computed
  incrementally from the volume-weighted variance of typical price; collapses to
  the VWAP line when intra-session dispersion is zero.
