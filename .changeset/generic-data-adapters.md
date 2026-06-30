---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Add generic data-adapter base classes so any feed plugs in with ~20 lines instead of a full `DataAdapter` implementation:

- **`WebSocketAdapter`** — configurable WebSocket adapter: supply a `wsUrl`, a `parseMessage` that returns a bar/tick, an optional `subscribeMessage`, and a REST `fetchHistory`. The base handles the connection lifecycle, frame decoding, subscribe/unsubscribe, tick synthesis, and event emission, with an injectable socket factory for testing. Reconnection stays orchestrated by `StreamManager`, matching `BinanceAdapter`.
- **`PollingAdapter`** — REST-polling adapter for feeds without a WebSocket (most stock / FX APIs): supply `fetchBars` + an interval. Emits the latest bar as forming and the prior bar as closed on bucket rollover.

These are the foundation for the upcoming Coinbase / Bybit / Kraken adapters.
