---
'@tradecanvas/chart': patch
---

feat: drawing favorites strip

- Pin frequently-used drawing tools to a strip at the top of the sidebar.
  Right-click any tool (in a group flyout or the strip) to pin/unpin it; the
  set persists to localStorage. Seed the initial pins with the new
  `drawingFavorites` widget option. The strip is always available and hides
  while empty.
- New `DrawingFavoritesStore` (injectable storage, dedup, corruption-tolerant)
  with full unit coverage.
