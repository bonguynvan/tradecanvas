---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Workspace, markets and access.**

- **Quotes**: `Quote`, `QuoteSource`, `readQuote`; `DataAdapter.subscribeQuotes`
  (BinanceAdapter: a 24 h snapshot, then the mini-ticker stream; MockAdapter
  made-up quotes).
- **Watchlists**: `watchlist` takes `{ lists, activeList, persist, storageKey,
  quotes, onChange }`; lists to switch, create, rename and delete; symbols
  added from the symbol search, removed and reordered (drag, Alt+↑/↓).
  `getWatchlists`, `setWatchlists`, `setActiveWatchlist`, `addToWatchlist`,
  `removeFromWatchlist`, `setQuotes`, `getQuote`; `readWatchlists`.
- **Symbol info**: a panel with price and move, the market's status, the
  day's numbers, hours and news (`symbolInfo`, `news`, `toggleSymbolInfo`);
  `marketStatus`, `SymbolSession.days`, `NewsItem`, `readNews`,
  `DataAdapter.fetchNews`. The status bar shows the market's status.
- **Undo**: `Chart.recordUndo` for changes of your own; the widget's settings
  and chart type are undone with drawings and indicators.
- **Events**: `chartTypeChange`, `symbolChange`, `timeframeChange`,
  `historyChange`, `drawingSelect`; `Chart.selectDrawing`, `Chart.scrollBars`.
- **Navigation** buttons over the chart (`navigation`).
- **Accessibility**: charts are announced with a summary, the view after a
  key moves it, and the bars one at a time (comma and period);
  `ChartOptions.a11y`.
- **Right to left**: `dir` (auto for Arabic, Hebrew, Persian, Urdu); logical
  CSS; Arabic and Hebrew widget strings (16 languages).
- **Tick charts**: `'100T'` timeframes from a feed's trades (`Trade`,
  `DataAdapter.fetchTrades` / `subscribeTrades`, `tickBarCount`,
  `TickBarBuilder`, `TickBarAdapter`, `withTickBars`); Binance aggregate
  trades.
- **Indicators**: SMI, Relative Volatility Index, Trend Strength Index,
  Linear Regression Slope, Standard Error, Standard Error Bands, GMMA, MA
  Ribbon, Average Day Range, Net Volume (95 in all).
