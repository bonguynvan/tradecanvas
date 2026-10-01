---
'@tradecanvas/core': patch
---

Fix the structural source of interaction jank: `Viewport.getState()`
deep-cloned 4 nested objects (`visibleRange`, `priceRange`, `chartRect`,
plus the flat fields) on **every single call** — and a single render pass
calls it 8-10+ times (render context, panel layout, overlay plugins, event
emission, the interaction manager's own hit-testing on every mousemove, …),
on **every pan/zoom/resize frame**. That's a steady stream of short-lived
garbage generated at 60fps during continuous dragging — a classic cause of
GC-pause micro-stutter, independent of how large the loaded dataset is.

`getState()` now returns a cached snapshot, invalidated by every mutating
method (`scrollBy`, `zoom`, `setPriceRange`, `setChartRect`, `updateData`,
…). Multiple reads between mutations — which is most reads, since a single
frame reads far more than it writes — now return the same object instead of
re-cloning. No caller changes needed; the public contract ("returns an
immutable snapshot, safe to store/pass") is unchanged and, if anything,
slightly strengthened (repeated calls between mutations are now reference-
equal, not just value-equal).
