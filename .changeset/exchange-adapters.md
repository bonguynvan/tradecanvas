---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Add built-in Coinbase, Bybit, and Kraken data adapters (no API key required), built on the new generic adapter base classes:

- **`CoinbaseAdapter`** — Coinbase Exchange REST candle polling, covering all supported granularities (the WS candles channel does not). Product ids use the `BTC-USD` format.
- **`BybitAdapter`** — Bybit v5 `kline` WebSocket stream + REST history. Symbols use the `BTCUSDT` format; `spot` / `linear` / `inverse` categories.
- **`KrakenAdapter`** — Kraken WebSocket v2 `ohlc` channel + REST history. WS symbols use the `BTC/USD` format; the REST pair is derived by stripping the slash.

Each was implemented against the exchange's official API docs — candle field order, interval encoding, and ms-vs-seconds time units verified — with parser unit tests over documented sample payloads.
