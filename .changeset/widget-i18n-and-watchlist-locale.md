---
'@tradecanvas/core': patch
'@tradecanvas/chart': minor
---

Three fixes/features requested after embedding `ChartWidget` with
`numberLocale: 'vi-VN'`:

- **i18n for widget chrome** — new `locale` (`'en'` default, built-in `'vi'`)
  and `messages` (per-key override/addition) options translate the toolbar,
  watchlist header, indicator-picker (Popular/All, overlay/panel tags),
  status bar, settings panel (titles/tabs/section headers), and hotkey
  sheet (title/group headers). See README "Widget i18n" for exact coverage
  and what's still English.
- **`numberLocale` now applied to the watchlist and the current-price axis
  tag** — both hardcoded `en-US`/raw `toFixed()` formatting before, so a
  vi-VN host saw `83638.46` in the watchlist next to a correctly-formatted
  `125,00` on the price axis. Also fixed: `ChartWidget`'s own
  `settingsState.numberLocale` was never seeded from the constructor's
  `chartOptions.numberLocale` — it silently stayed on `'en-US'` until the
  host touched the Settings UI, even though the headless `Chart` itself had
  the right locale the whole time.
- **Watchlist % for the active symbol now respects a host-provided
  `refPrice`** — previously `setWatchlistEntry(activeSymbol, { refPrice })`
  was silently overwritten every tick by the widget's own session-open
  guess. A host-pushed refPrice (even for the active symbol) now always
  wins; falls back to the auto-computed one only when the host hasn't set
  one for that symbol.

Also documents the `--tcw-*` CSS custom properties on `.tcw-root` as a
stable, additive-only theming contract (README "Widget Theming").
