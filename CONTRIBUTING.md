# Contributing to TradeCanvas

Thanks for helping. Bug reports, ideas, docs fixes and pull requests are all welcome.

## Before you start

- **Bugs**: open an [issue](https://github.com/bonguynvan/tradecanvas/issues/new/choose) with the smallest setup that shows it: the options you passed, the data (a few bars is often enough), what you expected and what happened. A fork of one of the [StackBlitz sandboxes](https://bonguynvan.github.io/tradecanvas/examples/) is the quickest way to share one.
- **Features**: open an issue first for anything larger than a small fix, so we can agree on the API before you build it.
- **Security issues**: don't open an issue; see [SECURITY.md](./SECURITY.md).

## Setup

You need Node 20.19 or later (CI uses 22) and pnpm 9.

```bash
git clone https://github.com/bonguynvan/tradecanvas.git
cd tradecanvas
pnpm install
pnpm build        # every package; the demo and the wrappers read the built output
pnpm test         # unit tests of every package
pnpm --filter @tradecanvas/demo dev   # the site with the Feature Lab, on localhost
```

While you work on a package, `pnpm --filter @tradecanvas/core dev` (or `chart`, `commons`) rebuilds it on save; reload the demo to see the change.

## The repo

| Path | What's there |
|---|---|
| `packages/commons` | Shared types, themes and small utilities. No DOM. |
| `packages/core` | The engine: viewport, renderers, indicators, drawings, trading, data adapters. |
| `packages/library` | `@tradecanvas/chart`: the `Chart` class, and `ChartWidget` with its UI under `src/widget`. |
| `packages/analytics` | Backtester, strategies and risk metrics. |
| `packages/react`, `vue`, `svelte` | Framework wrappers. |
| `demo` | The SvelteKit site: Feature Lab, docs in six languages, examples. |
| `skills/tradecanvas` | The agent skill; its examples are type-checked in CI. |
| `scripts` | Generated docs (`pnpm docs:gen`) and their checks. |

## Making a change

1. **Test first.** Tests run on Vitest and sit next to the code they cover, mostly in `__tests__` folders. Write one that fails without your change, then make it pass.
2. **Keep the style of the code around it**: TypeScript strict, no new runtime dependencies, small focused functions, no `console.log`.
3. **Run the checks CI runs:**
   ```bash
   pnpm build && pnpm typecheck && pnpm test
   pnpm docs:check                         # generated docs are current
   pnpm --filter @tradecanvas/demo check   # if you touched the site
   pnpm --filter @tradecanvas/demo test
   ```
   If `docs:check` fails, run `pnpm docs:gen` and commit what it writes.
   For a change to how the chart draws, `pnpm build && pnpm bench:render` measures frames in Chrome on your GPU; put the numbers before and after in the pull request.
4. **Add a changeset** for anything users of the packages will notice: `pnpm changeset`, pick the packages, and describe the change from the user's side. Docs-only and site-only changes don't need one.
5. **Docs**: a new option or method belongs in the README and the docs pages. Write the English; translations into the other languages can follow in a later pull request.

## Pull requests

- One topic per pull request, from a branch off the latest `main`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `fix: …`, `feat: …`, `docs: …`, `test: …`, `refactor: …`, `perf: …`, `chore: …`.
- Describe what changed and how you checked it. A screenshot or a short clip helps for anything visual.
- CI must pass before a review.

By contributing you agree that your work is released under the [MIT License](./LICENSE), and to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
