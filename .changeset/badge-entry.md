---
'@tradecanvas/chart': patch
'@tradecanvas/svelte': patch
---

The Powered by badge without the chart: `@tradecanvas/chart/brand` exports the badge (`createPoweredBy`, `poweredByHtml`, `poweredByLayout`, the mark and the wordmark) and reaches none of the chart, so a page that shows the badge and draws no chart no longer loads the chart's engine with it. The Svelte `<PoweredBy>` imports from it. The main entry still exports the same names.
