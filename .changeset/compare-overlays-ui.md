---
'@tradecanvas/chart': patch
---

feat: multi-symbol compare overlays UI

- The object tree gains a **Compare** section. With a live adapter, its +
  button opens the symbol picker, fetches the chosen symbol's history via
  `adapter.fetchHistory`, and overlays it as a normalized line (percent mode by
  default so mixed-price symbols share one axis). Each comparison shows a colour
  dot and a remove button; overlays auto-refetch on timeframe change and drop
  themselves if they become the active symbol.
- New `widget.addCompareSymbol(symbol)` (async, adapter-backed). The symbol
  picker now accepts a one-shot pick override so it can route to comparison
  instead of switching the main symbol. Surfaces the existing core
  `CompareRenderer` that previously had no widget UI.
