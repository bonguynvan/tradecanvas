# chart-lib

High-performance canvas trading chart library with built-in indicators, drawing tools, and real-time streaming. Zero runtime dependencies.

> **Status:** Pre-release. Currently in internal audit/improvement phase before public npm publication as `@vanbo/trading-chart` (or `@vanbo/chart-lib`).

## Packages

This is a pnpm monorepo containing three packages:

| Package | Description |
|---|---|
| `@chart-lib/commons` | Shared types, themes, i18n, market presets, constants |
| `@chart-lib/core` | Rendering engine, chart types, indicators, drawing tools, realtime adapters, trading overlay |
| `@chart-lib/library` | Public facade — the package consumers will install |

## Development

```bash
pnpm install
pnpm build        # build all packages
pnpm dev          # watch mode across all packages
pnpm typecheck    # type-check all packages
```

## Features

- **Chart types**: Candlestick, Hollow Candle, Line, Area, Bar, Baseline, Renko, Kagi, Point & Figure, Heikin-Ashi
- **Indicators**: 26 built-in (RSI, MACD, Bollinger, Ichimoku, Supertrend, ATR, Stochastic, Volume Profile, etc.)
- **Drawing tools**: 24 built-in (Trend lines, Fib, Gann, Pitchfork, Elliott Wave, etc.)
- **Realtime**: Pluggable stream adapters (Binance included), tick aggregation, reconnect/heartbeat
- **Trading overlay**: Order/position rendering with drag-to-modify, depth of market
- **Features**: Alerts, bar-by-bar replay, undo/redo, data export, screenshot, watermark
- **Zero runtime dependencies**

## License

TBD (will be MIT or Apache-2.0 on first publish)
