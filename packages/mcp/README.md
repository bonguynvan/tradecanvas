# @tradecanvas/mcp

An [MCP](https://modelcontextprotocol.io) server for [TradeCanvas](https://tradecanvas.dev/), so a coding agent looks names up instead of guessing them. It answers from a catalog generated from the library's own code: the same version, the same names.

```bash
claude mcp add tradecanvas -- npx -y @tradecanvas/mcp
```

On Windows outside WSL, npx starts through `cmd`:

```bash
claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp
```

In Git Bash, which runs the `!` commands of Claude Code on Windows, write `cmd //c npx -y @tradecanvas/mcp`: Git Bash turns `/c` into a path.

Cursor, Claude Desktop and most other clients take the same command in their MCP settings (on Windows, `"command": "cmd", "args": ["/c", "npx", "-y", "@tradecanvas/mcp"]`):

```json
{
  "mcpServers": {
    "tradecanvas": { "command": "npx", "args": ["-y", "@tradecanvas/mcp"] }
  }
}
```

## Tools

All of them read only; none touches the network or your files.

| Tool | What it answers |
|---|---|
| `list_indicators` | The built-in indicators: id, name, and whether it draws over the price or in a pane. Search by words. |
| `get_indicator` | One indicator in full: default params, inputs, the keys of its lines (RSI's is `value`, not `rsi`), levels, and code that adds it and reads it. |
| `list_drawing_tools` | The drawing tools: the `type` that `addDrawing` and `setDrawingTool` take, the points each needs, its options. |
| `list_options` | The options of `ChartWidget`, `Chart` or `ChartWidgetGrid`: name, TypeScript type, doc, allowed values. |
| `list_widget_features` | The names `ChartWidget`'s `features` switch takes. |
| `list_style_keys` | The chart's style keys and the value each takes, for `overrides` and `applyOverrides`. |
| `validate_options` | Checks an options object before it is used: unknown names with the one likely meant, values outside the allowed ones, numbers given as strings, intervals, feature switches, style overrides, languages, and nested options. |

A check, for instance:

```json
{ "target": "ChartWidget", "options": { "timeFrame": "5m", "chartType": "line", "locale": "ja" } }
```

```text
- timeFrame: Unknown option 'timeFrame' for ChartWidget. Did you mean 'timeframe'?
- chartType: Unknown option 'chartType' for ChartWidget. It is a Chart option: on ChartWidget it goes in `chartOptions`.
Note: 日本語 ('ja') is not built into the widget: call registerWidgetLocales() from '@tradecanvas/chart/widget/locales' before creating it.
```

## Also

- The agent skill teaches the API itself, with worked examples: `/plugin marketplace add bonguynvan/tradecanvas` in Claude Code, or `npx skills add bonguynvan/tradecanvas`.
- [llms.txt](https://tradecanvas.dev/llms.txt) and [llms-full.txt](https://tradecanvas.dev/llms-full.txt) hold the docs in one file.

Node 20.19 or later. MIT.
