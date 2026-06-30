# v1 Frozen Contracts (Phase 0)

> These are the interfaces TradeCanvas commits to at `1.0.0` and will not break under 1.x. Everything else (new chart types, indicators, adapters, plugins) is additive and can ship any time. Get **these** right once.

Principle: **broaden additively, freeze the contracts.** Each contract below either (a) already exists and is good enough to freeze as-is, or (b) is net-new but slots into an existing seam so it's backward-compatible.

Status legend: 🟢 freeze as-is · 🟡 freeze + additive surface · 🔵 net-new

---

## A. `DataAdapter` 🟢 freeze as-is, add base adapters

The existing interface (`packages/commons/src/types/realtime.ts`) is already a clean observer-pattern strategy. **No interface change** — we freeze it verbatim:

```ts
interface DataAdapter {
  readonly name: string;
  connect(config: DataAdapterConfig): void;
  disconnect(): void;
  getConnectionState(): ConnectionState;
  fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]>;
  on<T>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void;
  off<T>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void;
  dispose(): void;
}
```

The "any feed plugs in" value is **additive base classes**, not an interface change:

- **`WebSocketAdapter`** (configurable base): supply `wsUrl(symbol, tf)`, optional `restUrl(...)`, `subscribeMessage?(symbol, tf)`, and `parseMessage(raw) → { bar? , tick? }`. Reconnect/heartbeat handled by the existing `ReconnectManager`.
- **`PollingAdapter`** (base): supply `fetchBars(symbol, tf, limit)` + `intervalMs`. For REST-only feeds (most stock/FX APIs) with no WebSocket.
- **`CoinbaseAdapter`, `BybitAdapter`, `KrakenAdapter`**: thin subclasses of `WebSocketAdapter`.

A user adapter becomes ~20 lines (URL + a parse function) instead of implementing the whole interface. `MockAdapter` stays the reference paper/test feed.

**Decision:** none. Interface frozen as-is.

---

## B. Plugin SDK 🟡 freeze the 4 plugin contracts, real registry

The plugin *value types* already exist and are clean (`IndicatorPlugin`, `DrawingPlugin`). Today `PluginManager` only does `registerIndicator`. We promote it to a registry over **four** plugin kinds and freeze all four contracts.

```ts
// existing, frozen as-is:
interface IndicatorPlugin { descriptor; calculate(data, config); render(ctx, output, viewport, style); }
interface DrawingPlugin   { descriptor; render(ctx, state, viewport, selected); hitTest(...); hitTestAnchor(...); }

// new, wrapping the existing ChartRendererInterface + ChartTypeStrategy transform:
interface ChartTypePlugin {
  descriptor: { type: string; name: string };
  createRenderer(): ChartRendererInterface;
  transform?(data: DataSeries): DataSeries;   // e.g. heikinAshi/renko-style derived series
}

// new, for custom data layers (volume-profile-style overlays):
interface OverlayPlugin {
  descriptor: { id: string; name: string; layer?: 'main' | 'overlay' | 'ui' };
  render(ctx: CanvasRenderingContext2D, c: OverlayRenderContext): void;
  hitTest?(point: Point, c: OverlayRenderContext): boolean;
}
interface OverlayRenderContext { viewport: ViewportState; data: DataSeries; theme: Theme; }

type ChartPlugin =
  | { kind: 'indicator'; plugin: IndicatorPlugin }
  | { kind: 'drawing';   plugin: DrawingPlugin }
  | { kind: 'chartType'; plugin: ChartTypePlugin }
  | { kind: 'overlay';   plugin: OverlayPlugin };

export const PLUGIN_API_VERSION = 1;   // plugins can guard against future majors
```

Base classes (`IndicatorBase`, `DrawingBase` exist; add `ChartTypeBase`, `OverlayBase`) provide the ergonomic authoring path.

**Registration surface — DECISION NEEDED (see below):** the recommended model exposes three layers that compose:
- **Global** default registry: `registerPlugin(p)` / `registerIndicator(p)` … — every new `Chart` inherits it. (Keeps today's `registerIndicator` working.)
- **Constructor**: `new Chart(el, { plugins: ChartPlugin[] })`.
- **Instance**: `chart.plugins.register(p)` / `.unregister(id)` / `.list()`.

Usage:
```ts
import { registerPlugin, IndicatorBase } from '@tradecanvas/chart';
class MyIchimoku extends IndicatorBase { /* descriptor/calculate/render */ }
registerPlugin({ kind: 'indicator', plugin: new MyIchimoku() });   // available to all charts
```

---

## C. `ExecutionAdapter` 🔵 net-new, slots into the existing intent seam

Today trading is display-only: `chart.placeOrderIntent(intent)` **emits** `'orderPlace'` and the host wires it to its OMS by hand; `setOrders`/`setPositions` are the authoritative render sinks. The `ExecutionAdapter` automates that round-trip. **Mirror `DataAdapter`'s shape** for consistency.

```ts
type ExecutionEventType = 'orders' | 'positions' | 'fill' | 'connectionChange' | 'error';

interface ExecutionAdapter {
  readonly name: string;
  connect(config: ExecutionConfig): void | Promise<void>;
  disconnect(): void;
  getConnectionState(): ConnectionState;       // reuse the data-side enum

  placeOrder(intent: OrderPlaceIntent): Promise<TradingOrder>;
  modifyOrder(intent: OrderModifyIntent): Promise<void>;
  cancelOrder(intent: OrderCancelIntent): Promise<void>;
  modifyPosition(intent: PositionModifyIntent): Promise<void>;   // SL/TP edit
  closePosition(intent: PositionCloseIntent): Promise<void>;

  on<T>(event: ExecutionEventType, listener: (e: ExecutionEvent<T>) => void): void;
  off<T>(event: ExecutionEventType, listener: (e: ExecutionEvent<T>) => void): void;
  dispose(): void;
}
```

All five intent types **already exist** in `commons/types/trading.ts` — we reuse them verbatim.

**Wiring** (mirrors `chart.connect` for data):
```ts
chart.connectExecution(new PaperExecutionAdapter(), { account: 'demo' });
```
On connect, the chart:
1. subscribes to the adapter's `orders`/`positions` events → feeds `setOrders`/`setPositions` (re-render);
2. routes its own emitted intents (`orderPlace`/`orderModify`/`orderCancel`/`positionModify`/`positionClose`) into the adapter's methods.

**Backward compatible:** with no execution adapter connected, intents are still plain events (today's behavior) — nothing breaks for existing users.

**Safety / batteries:** ship **`PaperExecutionAdapter`** — virtual fills + in-memory positions (pairs with the backtester's fill model). It's the default for demos/tests and the safe sandbox before anyone wires a real broker. Drag-to-create orders (Phase 2) just produces an `OrderPlaceIntent` and is adapter-agnostic.

**Decision needed:** who owns order/position state — see below.

---

## Supporting Phase 0 work

- **Benchmark harness baseline** — a headless `bench/` runner: generate N synthetic bars, mount a `Chart` with M indicators, drive pan/zoom frames, report median FPS + frame time + memory. Establishes the number we publish and regression-guard against as we add features.
- **`commons` test scaffolding** — `commons` has **zero** tests; stand up vitest there and cover the pure stuff first (math utils, `timeframeToMs`, market presets, i18n fallback, normalizers).

---

## Decisions (resolved — implemented & frozen)

1. **Plugin registration model** → **global + constructor + instance.** `registerPlugin()` populates a global default registry inherited by every chart; `new Chart(el, { plugins })` and `chart.plugins.register()` scope per-instance. Implemented in `library/src/plugins/{registry,PluginManager,contracts}.ts`.
2. **Execution state ownership** → **adapter is the source of truth.** The chart holds no trading state; it routes intents to the adapter and renders the `orders`/`positions` the adapter emits. Implemented as the `ExecutionAdapter` contract (`commons/types/execution.ts`) + `PaperExecutionAdapter` reference (`core/trading`).

Phases 1–2 build on these frozen contracts:
- **Phase 1** — `WebSocketAdapter` / `PollingAdapter` base classes + Coinbase/Bybit/Kraken; render-time consumption of `ChartTypePlugin` / `OverlayPlugin`.
- **Phase 2** — `chart.connectExecution(adapter)` wiring (route intents → adapter, subscribe adapter → `setOrders`/`setPositions`), drag-to-create orders, alerts→automation.
