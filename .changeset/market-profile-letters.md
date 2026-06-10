---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: TPO letters for the session-split Market Profile

- **`setMarketProfileConfig({ splitBySession: true, letters: true })`** renders
  the classic TPO letter columns (A, B, C…) per session instead of solid
  histogram bars — each bracket is a letter placed in every price bucket it
  traded. Value-area rows use the accent colour; the renderer auto-falls back
  to bars when bucket rows are too short to print legible glyphs.
- Pure, tested helpers exported from `@tradecanvas/core`: `tpoLetter(index)`
  (A–Z then a–z, wrapping) and `assignSessionLetters(bars, min, max, buckets)`.
  Settings sheet gains an "MP letters (TPO)" toggle.
