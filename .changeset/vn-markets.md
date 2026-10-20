---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Exchange rules for Vietnamese markets, checked against the exchanges' rules of May 2025.

- `MarketConfig.priceSteps`: price steps by price band (HOSE: 10, 50 or 100 dong), with `priceStepAt`, `roundToPriceStep` and `scaleMarketPrices` (presets are in thousands of dong; `scaleMarketPrices(preset, 1000)` reads dong).
- `computePriceLimits` rounds the ceiling down and the floor up to a valid price, and moves them a step off the reference when they would land on it.
- Presets: HOSE with its price bands and lots of 100, `MARKET_HOSE_ETF` (10-dong steps), HNX with its post-close session, UPCoM with its own sessions, and `MARKET_VN30F` for VN30 index futures (0.1 a point, ±7%, from 8:45), each with `timeZone: 'Asia/Ho_Chi_Minh'`.
- `vn30fLastTradingDay` and `vn30fContracts`: the third-Thursday expiry, holidays included, and the four listed contracts.
- `getCurrentSession(sessions, now, timeZone)` reads the exchange's clock (the time of day only).
- `chart.getPriceLimits()`; `chart.roundPrice` and `chart.getPriceStep(price?)` follow the market's band; `setPriceLimits` no longer changes the preset it was given.
- The widget's order ticket keeps prices on the market's step and the order's price within the day's ceiling and floor, starts at one lot, and takes whole lots above one.
- Looks different: `VN_COLORS` are the price board's (green up, red down) instead of red up and blue down.
