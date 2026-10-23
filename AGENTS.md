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
| `packages/library` | `@tradecanvas/chart`: the `Chart` class (`src/Chart.ts`), and `ChartWidget` with its UI in `src/widget`. |
| `packages/analytics` | Backtester, strategies, risk metrics. |
| `packages/mcp` | `@tradecanvas/mcp`: the MCP server for coding agents. Its catalog is generated from the other packages (`scripts/mcp-catalog.mjs`). |
| `packages/react`, `vue`, `svelte` | Framework wrappers. They read the built output of `library`. |
| `demo` | The Feature Lab you run locally, and the source of the docs in six languages, which [tradecanvas.dev](https://tradecanvas.dev/) publishes. |
| `skills/tradecanvas` | The agent skill users install. Its code examples are type-checked. |
| `scripts` | Docs generated from the code, and their checks; `redirects.mjs` sends the old GitHub Pages addresses on to tradecanvas.dev; `record-clips.mjs` records the README clips (`.github/assets/clips`) from the scenes in `scripts/clips`, and with `--web <dir>` an MP4 and a poster of each for a web page. |

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
  `skills/tradecanvas/references/indicators.md`, `packages/library/README.md`
  and `packages/mcp/src/catalog.json`. Never edit those by hand: change the
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
  option breaks it.

## Widget UI

- Styles live in `src/widget/WidgetStyles.css` and `WidgetControls.css`
  (fields, lists, calendar, scrollbars), injected by `WidgetStyles.ts`.
- Colours, radii and spacing are `--tcw-*` tokens, set for the dark default
  and `[data-tcw-theme='light']`; the Studio, Terminal and Capsule looks are
  presets in `src/widget/widgetUI.ts`. Use a token, not a literal colour.
- Dialogs and menus open in the overlay layer (`overlayHost`), so they sit
  above the chart and inside the widget in fullscreen. Place a menu with
  `placeMenu()`; it flips above the anchor when there is no room below.
- A visible change needs a look in a real browser at a phone width, a laptop
  width and a wide one, in both themes and the three looks, before the pull
  request. Put a screenshot or a short clip in it.

## Before you commit

- `pnpm build` rewrites the tracked files in `packages/svelte/.svelte-kit`.
  Unless you changed the Svelte wrapper, undo that:
  `git checkout -- packages/svelte/.svelte-kit`.
- One topic per pull request, from a branch off the latest `main`.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`.
- The pull request says what changed and how it was checked.
