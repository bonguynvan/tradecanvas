# @tradecanvas/chart

## 0.3.0

### Minor Changes

- Add WaterfallChart and GaugeChart — two new finance-specific chart components.

  **WaterfallChart** — Visualize running totals with positive/negative contributions. Perfect for P&L attribution, revenue bridges, and cash flow analysis.

  ```typescript
  import { WaterfallChart } from "@tradecanvas/chart";

  new WaterfallChart(container, {
    data: [
      { label: "Start", value: 10000, type: "total" },
      { label: "Gain", value: 1850 },
      { label: "Loss", value: -620 },
      { label: "End", value: 11230, type: "total" },
    ],
    showValues: true,
    crosshair: true,
  });
  ```

  **GaugeChart** — Speedometer-style gauge for KPIs, risk scores, and sentiment indicators with colored zones and smooth value animation.

  ```typescript
  import { GaugeChart } from "@tradecanvas/chart";

  const gauge = new GaugeChart(container, {
    value: 72,
    min: 0,
    max: 100,
    label: "Fear & Greed",
    zones: [
      { from: 0, to: 25, color: "#ef4444" },
      { from: 75, to: 100, color: "#10b981" },
    ],
    animate: true,
  });

  gauge.setValue(85); // smooth animation to new value
  ```

  Both charts share the performant `BaseFinanceChart` infrastructure: DPR-aware canvas, auto-resize, theme switching, and batched path operations for efficient rendering.

### Patch Changes

- Updated dependencies
  - @tradecanvas/commons@0.3.0
  - @tradecanvas/core@0.3.0

## 0.2.0

### Minor Changes

- Add 4 finance chart components (SparklineChart, DepthChart, EquityCurveChart, HeatmapChart), client-side order matching engine with trade history, and comprehensive developer documentation.

  Features:

  - SparklineChart: tiny inline line/area chart for dashboards
  - DepthChart: bid/ask order book visualization with crosshair
  - EquityCurveChart: portfolio equity with drawdown shading and benchmark
  - HeatmapChart: colored cell grid with treemap layout
  - Order matching engine: auto-fills limit/stop orders with spread and commission
  - Trade history with win rate and PnL stats
  - Toast notifications for order fills and SL/TP triggers
  - Trade-on-chart via built-in right-click context menu
  - TC prefix on all generated IDs
  - Auto-scale includes overlay indicator values
  - StackBlitz interactive sandboxes (Vanilla JS, React, Svelte, Vue)
  - Panel indicators now render immediately (no interaction needed)

  Bug fixes:

  - Stop orders show correct STOP label
  - Fix workspace:\* deps in published packages

### Patch Changes

- Updated dependencies
  - @tradecanvas/commons@0.2.0
  - @tradecanvas/core@0.2.0
