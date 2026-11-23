## What and why

<!-- What this changes, and the issue it fixes (Fixes #123) if there is one. -->

## How it was checked

<!-- Tests added or changed. A change to the widget or the engine: say that `pnpm audit:scenes` passed on your machine (nothing else runs it), or that you have no Playwright, and a maintainer will label the pull request `audit` to shoot the scenes here. Say what you left to the maintainers (the other languages, docs translations). -->

## Checklist

- [ ] A test that fails without the change and passes with it
- [ ] `pnpm build && pnpm typecheck && pnpm test` pass
- [ ] `pnpm docs:check` passes (run `pnpm docs:gen` if it doesn't)
- [ ] A changeset (`pnpm changeset`) if users of the packages will notice the change
- [ ] Docs and README updated for a new option or method
