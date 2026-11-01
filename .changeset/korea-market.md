---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Korea's markets: `MARKET_KRX` (KOSPI and KOSDAQ: steps by price band in won, ±30% limits rounded as KRX rounds them, the calls, the regular session and the After-Market), `MARKET_NXT` (Nextrade) and `MARKET_UPBIT_KRW` (Upbit's KRW market), with `KRX_SESSIONS`, `NXT_SESSIONS` and `KR_COLORS` (red up, blue down). `UpbitAdapter` streams Upbit's candles and loads its history. `createMarketTheme(theme, colors)` gives any theme a market's candle colours; `priceLimits.roundMove` rounds the move before the limits, as KRX does; `formatVolumeLoc(value, 'ko')` shortens volumes in 만, 억 and 조.
