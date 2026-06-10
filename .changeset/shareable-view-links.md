---
'@tradecanvas/chart': patch
---

feat: shareable view deep-links

- Encode the full widget view — symbol, timeframe, chart type, price-scale
  mode, indicators (with params), and drawings — into a compact, URL-safe
  token. New `widget.exportState()` / `importState()` / `copyShareLink()`, and a
  "Share View (copy link)" command-palette action. With the new `shareUrl: true`
  option the widget restores a `#tcw=<token>` URL hash on load.
- Pure, tested codec (`encodeWidgetState` / `decodeWidgetState`, base64url +
  versioning, unicode-safe, null on malformed) plus `readShareHash` /
  `buildShareUrl` helpers.
