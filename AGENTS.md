# Working on TradeCanvas

Notes for coding agents (and the people driving them) who change this repo.
To *use* TradeCanvas in an app, read the skill in
[`skills/tradecanvas`](skills/tradecanvas/SKILL.md) instead. People start with
[CONTRIBUTING.md](CONTRIBUTING.md); this file holds the same rules plus the
ones that only show up as a failing check.

## The repo

A pnpm workspace, TypeScript strict, no runtime dependencies in any package.

| Path | What's there |
|---|---|
| `packages/commons` | Shared types, themes, the icon set (`src/icons/iconSet.ts`). No DOM. |
| `packages/core` | The engine: viewport, renderers (Canvas 2D and WebGL), indicators, drawings, trading, data adapters. |
| `packages/library` | `@tradecanvas/chart`: the `Chart` class (`src/Chart.ts`), its bars in `src/SeriesStore.ts` (every write goes through it), the chart's state with no DOM in `src/model` (the series a chart type draws, when the price scale is fitted, the panes as drawn, which pane each indicator is in, the indicators' undo steps and saved setup, the pane a drawing goes on, the other symbols indicators read, what the alerts are checked against and what they follow, the prices a paper account trades on in a replay), tested in plain Node, and `ChartWidget` with its UI in `src/widget`. |
| `packages/analytics` | Backtester, strategies, risk metrics. |
| `packages/mcp` | `@tradecanvas/mcp`: the MCP server for coding agents. Its catalog is generated from the other packages (`scripts/mcp-catalog.mjs`). |
| `packages/react`, `vue`, `svelte` | Framework wrappers. They read the built output of `library`. |
| `demo` | The Feature Lab you run locally, and the source of the docs in six languages, which [tradecanvas.dev](https://tradecanvas.dev/) publishes. |
| `benchmarks` | Those two measured on one machine, by date: what a change to the engine is compared with. |
| `evals` | Coding agents given tasks with and without the skill (`pnpm eval`); the runs to compare with in `evals/baselines`, and what they turned up in `evals/FINDINGS.md`; `pnpm eval:probe` asks, naming no library, which one a model would pick for a trading chart. |
| `skills/tradecanvas` | The agent skill users install. Its code examples are type-checked. |
| `scripts` | Docs generated from the code, and their checks; `bench-render.mjs` (`pnpm bench:render`) times the chart's frames in Chrome, `soak.mjs` (`pnpm soak`) leaves the widget on a million bars and a busy feed (`scripts/soak`) for minutes and reads its memory, nodes and frames, `size-report.mjs` (`pnpm size`) what a page downloads for each entry; `publish-packages.mjs` is the release's publish step (CI only): the version PR's merge publishes the versions it set on npm, one at a time, each after the ones it depends on and once they are live, through npm trusted publishing, from tarballs another job built (the job that publishes installs nothing), then tags the commit that set each version and makes its GitHub release; the Publish workflow runs it on every push to main, and run by hand finishes a release that stopped part way and opens the version PR for changesets that are waiting. A new package is published by hand once and given a trusted publisher on npmjs.com (this repo, `publish.yml`, `npm publish` allowed) before CI can publish it; `redirects.mjs` sends the old GitHub Pages addresses on to tradecanvas.dev; `record-clips.mjs` records the README clips (`.github/assets/clips`) from the scenes in `scripts/clips`, and with `--web <dir>` an MP4 and a poster of each for a web page; `audit-scenes.mjs` (`pnpm audit:scenes`) shoots the chart's states in `scripts/audit` and checks them. |

## Commands

```bash
pnpm install
pnpm build                     # every package; run it before typecheck, tests of the wrappers, and the demo
pnpm typecheck
TZ=UTC pnpm test               # CI runs in UTC; date and session tests assume it
pnpm docs:check                # generated docs are current, skill examples type-check
pnpm test:scripts              # after pnpm build: the GitHub Pages redirects and the MCP catalog
pnpm --filter @tradecanvas/demo check   # when you touched demo/
pnpm --filter @tradecanvas/demo test
```

One package while you work: `pnpm --filter @tradecanvas/core test`, or
`pnpm --filter @tradecanvas/chart exec vitest run src/widget/__tests__/formControls.test.ts`.

Run all of these before you open a pull request; CI runs the same.

## How a change is made here

1. **Test first.** Vitest, with tests in `__tests__` folders next to the code.
   Write the test that fails without the change, then make it pass. Widget
   tests run in jsdom: there is no `PointerEvent`, so dispatch a `MouseEvent`
   named `pointerdown`.
2. **Match the code around it**: small functions, named constants instead of
   magic numbers, no `console.log`, no new dependencies. Comments say *why* in
   plain sentences, as the existing ones do.
3. **A changeset** for anything a package user will notice
   (`pnpm changeset`, written from the user's side), and an entry under
   *Unreleased* in the root `CHANGELOG.md`. Docs-only and site-only changes
   need neither. The changelog records the packages and their docs, nothing
   about the website or the project's news.
4. **Docs** for a new option, method, event or style key: the page under
   `demo/src/lib/docs/en/`, and the README when it is a headline feature.
   The other five languages (`vi`, `zh`, `ja`, `ko`, `es`) may follow in a
   later pull request; say so in yours.
5. **The skill** when the public API changes: update
   `skills/tradecanvas/SKILL.md` or `references/recipes.md` so agents are
   taught the new way, not the old one.

## Rules a check enforces

These fail CI, often far from the line that caused them.

- **Generated files.** `pnpm docs:gen` (after `pnpm build`) writes
  `demo/static/llms.txt`, `llms-full.txt`, `demo/src/lib/generated/indicators.json`,
  `skills/tradecanvas/references/indicators.md`, `skills/tradecanvas/references/style-keys.md`,
  `packages/commons/src/types/builtInIndicators.ts` (the built-in indicators'
  ids, inputs and lines as types: build again after it changes),
  `packages/library/README.md` and `packages/mcp/src/catalog.json`. Never edit those by hand: change the
  source (the indicator registry, the docs, the root `README.md`, the option
  types and their doc comments) and regenerate. A new or renamed option,
  feature switch, style key or drawing tool shows up in the MCP catalog this
  way, so `docs:check` fails until it is regenerated.
- **Widget strings.** A new string is a key in `EN_MESSAGES`
  (`packages/library/src/widget/locales/en.ts`) and in each of the other 29
  language files beside it, with the same `{placeholders}`.
  `locales.test.ts` checks each one. Read text through `this.t('key')`, never
  a literal in the UI.
- **No emoji or symbol characters as icons.** Icons come from the icon set;
  `noEmoji.test.ts` scans `commons`, `core` and `library` for pictographs,
  dingbats, stars, checks, kebabs and their HTML or JS escapes. Key names
  (`Shift+←`) and typography (`…`, `3 × 4`) are fine.
- **Docs pages are Svelte.** In `demo/src/lib/docs/<lang>/*.svelte`, a `{` or
  `}` starts an expression, so code samples go inside `{`…`}` template
  literals (`<pre><code>{`...`}</code></pre>`) and a lone brace in prose is
  written `{'{'}`. Write `<` as `&lt;`.
- **Skill examples.** Every `ts` block in `skills/tradecanvas` is compiled
  against the built packages by `scripts/check-skill-examples.mjs`. A renamed
  option breaks it. So are the files in `scripts/type-tests`, which pin what
  the published types accept: a `@ts-expect-error` line there must fail.
- **Field notes are doc comments.** A field's note, or a union member's,
  goes above it as `/** … */`; a `//` at the end of its line never reaches
  the published types, and `fieldDocs.test.ts` fails on one.

## Widget UI

- Styles live in `src/widget/WidgetStyles.css`, `WidgetControls.css`
  (fields, lists, calendar, scrollbars), `WidgetDialogs.css`
  (the indicators dialog, the indicator settings and the chart settings) and
  `WidgetPanels.css` (the dock and its panels), injected by `WidgetStyles.ts`.
  Under vitest the `.css` files load empty: a test sees only the switches'
  rules (`widgetFeatureCss`), so check the rest in a browser.
- Colours, radii and spacing are `--tcw-*` tokens, set for the dark default
  and `[data-tcw-theme='light']`; the Studio, Terminal, Capsule and Desk looks are
  presets in `src/widget/widgetUI.ts`. Use a token, not a literal colour.
- Dialogs and menus open in the overlay layer (`overlayHost`), so they sit
  above the chart and inside the widget in fullscreen. Place a menu with
  `placeMenu()`; it flips above the anchor when there is no room below.
- The larger dialogs, the indicators dialog, the command palette and the
  symbol search load their code when first opened (`DIALOGS` in
  `src/widget/widgetDialogs.ts`, a `LazyPart` each in `ChartWidget`), so
  import them only as types elsewhere; `lazyDialogs.test.ts` fails on a
  value import. Open one through `whenLoaded()`, which reads the widget's
  state once the code is in, and in a test that opens one, add
  `beforeAll(preloadDialogs)`.
- `ChartWidget.ts` keeps the widget's public API, its setup and what ties
  the areas together. Its setup is a list of steps in the constructor, a
  private method each (`readOptions`, `buildRoot`, `buildToolbar`…
  `finishSetup`), in the order the parts need each other; a new part goes in
  the step it belongs to. Each area is a class of its own in `src/widget`:
  `WidgetReplay`, `WidgetCompares`, `WidgetWatchlists`, `WidgetAlerts`,
  `WidgetTrading`, `WidgetMenus`, `WidgetLegendView`, `WidgetCommands`,
  `WidgetLayouts`, `WidgetDockArea`, `WidgetChartSettings`,
  `WidgetDrawingEdit` and `WidgetIntervals`. Each reads the widget only
  through the host interface it is given (`ReplayHost`, `ComparesHost`…),
  which lists what it uses, typed from the widget's members. Add code to
  the area it belongs to; a public method stays on `ChartWidget` and hands
  on to its area. A test that reaches into an area goes through its field
  (`widget.chartSettings.openSettings()`).
- Widget state that several parts show is a signal (`src/widget/signals.ts`):
  one effect updates what shows it, instead of each writer calling each
  update. These are signals so far:
  - the theme (`look`);
  - what is open, by its toolbar button's role (`openRoles`, written with
    `markOpen(role, open)`);
  - the Chart Settings (`chartSettings.settingsState`), which an open
    settings dialog follows.

  A refresh of the dialog by hand is left only where something other than
  the settings changed: a look, the chart type, a compare's hold.
- A visible change needs a look in a real browser at a phone width, a laptop
  width and a wide one, in both themes and the three looks, before the pull
  request. Put a screenshot or a short clip in it.
- A change to the widget or the engine also runs `pnpm audit:scenes` (after
  `pnpm build`): the chart in the states dialogs never show (the price at an
  order with a quote on, a linked grid under the pointer, a replay, compares,
  Renko, the day's limits, many indicators), in both themes at three widths.
  It checks that no two price axis tags overlap and that a linked grid's
  legends follow the pointer, and writes a sheet per scene to `.tmp/audit`
  to look over. Add a scene to `scripts/audit/scenes.js` for a state a bug
  turned up.

## Before you commit

- `pnpm build` rewrites the tracked files in `packages/svelte/.svelte-kit`.
  Unless you changed the Svelte wrapper, undo that:
  `git checkout -- packages/svelte/.svelte-kit`.
- One topic per pull request, from a branch off the latest `main`.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`.
- The pull request says what changed and how it was checked.
