---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The finance charts draw their text in the system's sans face, as the widget's figures are, where they used the theme's monospaced one. Every finance chart takes `font` (the face and sizes; `{ family: DEFAULT_FONT_FAMILY }` brings the monospaced face back, and a theme with a face of its own keeps it) and `locale` (a BCP 47 tag for how numbers, percentages and dates are written; the browser's language without one). A depth chart's `spreadLabel` takes a word of yours; `PerformanceDashboard` takes `font`, `locale` and `labels` for its titles and stat names. The depth, equity curve, waterfall, sparkline and gauge charts describe themselves to screen readers when no `ariaLabel` is given. `@tradecanvas/core` exports `numberFormat`, `percentFormat` and `financeTheme`, and `axisFormat` takes a locale; `@tradecanvas/chart` exports `DEFAULT_DASHBOARD_LABELS` and the `DashboardLabels` type.
