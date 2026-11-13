# Roadmap

Where TradeCanvas is, and where it is going. This is a direction, not a
promise of dates: what ships is in the [changelog](./CHANGELOG.md), and what
a release is checked against is in [AGENTS.md](./AGENTS.md).

Last reviewed for 2.3 (November 2026).

## Where it is

The road to 1.0 that this file used to hold is finished, and 2.0 has shipped.
What the library has today:

- **The chart**: 18 chart types, 134 indicators, 73 drawing tools, on Canvas
  2D or WebGL, with no third-party dependencies.
- **Trading on the chart**: positions, orders and stops that are dragged, a
  paper account or a broker of your own through `ExecutionAdapter`, bracket
  orders, an order ticket, alerts, and since 2.3 a trailing stop.
- **Data**: feeds for Binance, Bybit, Coinbase, Kraken and Upbit, bases for a
  WebSocket or a polled feed of your own, replay, and timeframes built from
  the ones a feed serves.
- **The widget**: `ChartWidget` with its toolbar, panels and dialogs in 30
  languages, four looks, and a touch layout for phones.
- **Wrappers** for React, Vue and Svelte.
- **For coding agents**: a skill, an MCP server, the docs in one file, and
  evals that measure what an agent needs to get a task right
  ([the latest run](./evals/baselines/2026-11-13-sonnet.md)).

The contracts frozen at 1.0 (`DataAdapter`, `ExecutionAdapter`, the plugin
SDK, the event names) are recorded in [V1-CONTRACTS.md](./V1-CONTRACTS.md).
The two adapter interfaces read today as they were written there, with
members added since; what 2.0 took away were the names deprecated through
1.x, listed in the [changelog](./CHANGELOG.md).

## What is next

Small things first: what the last releases left open.

- **Trailing stop**: a field for the distance itself (today it is the
  distance between the entry and the stop), and a trail on a bracket order
  and on the quick order from the chart's menu.
- **The price axis**: one height for every tag, and the tags of a scale on
  the left written the way its labels are.
- **The widget on a phone**: the alerts panel and the dock's empty states.
- **Languages**: a read of the widget's 30 languages by people who speak
  them, and dates and times in a language written right to left.
- **Agents**: the evals run again with each minor release, and the docs a
  page at a time in Markdown beside the one-file version.

## What is being weighed

Larger, and not decided:

- **WebGL as the default renderer.** Canvas 2D stays the default until WebGL
  has been checked in the three browser engines on the machines people have.
- **A wrapper for Python notebooks**, for people who chart in Jupyter and
  not in a web app.
- **Many panes at once**: folding a stack of indicator panes away and back.
- **One action to clear a chart**: its drawings, its indicators, or both.

## What stays

- The library is MIT, with every chart type, indicator and drawing tool in
  it.
- No third-party dependencies in any package.
- The interfaces frozen at 1.0 are not broken inside a major version; a name
  that has to go is deprecated first and removed at the next major.

## Saying what you need

A use the library does not serve yet is worth more here than a vote: open a
[discussion](https://github.com/bonguynvan/tradecanvas/discussions) with
what you are building and where the chart stopped you. Bugs go in the
[issues](https://github.com/bonguynvan/tradecanvas/issues).
