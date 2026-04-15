# @tradecanvas/commons

Shared types, utilities, constants, themes, i18n, and market presets for the [@tradecanvas/chart](https://www.npmjs.com/package/@tradecanvas/chart) library.

**[Live Demo](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[Documentation](https://bonguynvan.github.io/tradecanvas/#getting-started)**

## Install

You don't need to install this package directly. It's included as a dependency of `@tradecanvas/chart`.

```bash
npm install @tradecanvas/chart
```

## What's Inside

### Types

All TypeScript interfaces and types used across the library:

- `OHLCBar`, `DataSeries`, `TimeFrame` -- data format
- `ChartOptions`, `ChartType`, `FeaturesConfig` -- chart configuration
- `Theme`, `ThemeName` -- theming
- `IndicatorPlugin`, `IndicatorDescriptor`, `IndicatorConfig` -- indicators
- `DrawingToolType`, `DrawingState`, `DrawingStyle` -- drawing tools
- `TradingPosition`, `TradingOrder`, `TradingConfig` -- trading overlay
- `DataAdapter`, `StreamConfig`, `ConnectionState` -- real-time streaming
- `ChartEventType`, `ChartEvent` -- events
- `MarketConfig`, `TradingSession` -- market configuration

### Themes

```typescript
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons'
```

19 customizable properties: `background`, `text`, `candleUp`, `candleDown`, `grid`, `crosshair`, `volumeUp`, `volumeDown`, and more.

### Constants

- Default chart options and feature flags
- Market presets: `MARKET_HOSE`, `MARKET_HNX`, `MARKET_UPCOM`, `MARKET_CRYPTO`, `MARKET_NYSE`
- Vietnamese stock market color schemes

### Utilities

- `computePriceRange()` -- compute visible price range from OHLC data
- `timeframeToMs()` -- convert timeframe string to milliseconds
- `formatNumber()`, `formatVND()`, `formatVolumeLoc()` -- number formatting
- Color, math, precision, and data manipulation helpers

### i18n

Built-in locales: English (`en`), Vietnamese (`vi`). Extensible via `registerLocale()`.

## Direct Usage

If you need just the types or utilities without the full chart:

```typescript
import type { OHLCBar, TimeFrame, ChartType } from '@tradecanvas/commons'
import { DARK_THEME, computePriceRange, timeframeToMs } from '@tradecanvas/commons'
```

## License

[MIT](https://github.com/bonguynvan/tradecanvas/blob/main/LICENSE)
