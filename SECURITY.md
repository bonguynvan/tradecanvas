# Security policy

## Supported versions

Fixes go into the latest release of each `@tradecanvas/*` package. Please check that a problem still happens on the latest version before you report it.

| Packages | Supported |
|---|---|
| `chart`, `core`, `commons`, `analytics` 1.7.x | Yes |
| `react`, `vue`, `svelte` 1.0.x | Yes |
| Older versions | No, please upgrade |

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through GitHub instead:

1. Open the repository's [Security tab](https://github.com/bonguynvan/tradecanvas/security).
2. Choose **Report a vulnerability** and describe the problem, the versions it affects, and how to reproduce it.

You'll get a reply within a week. Once a fix is released, the advisory is published with credit to you, unless you'd rather stay anonymous.

## Scope

TradeCanvas runs in the browser and draws data it's given. Reports we're most interested in:

- script injection through data, symbol names, drawing text, news items or any other string the library renders;
- data adapters sending requests or credentials somewhere they shouldn't;
- layouts or saved state that run code when loaded.

The demo site and its sample data feeds are in scope only where they show a flaw in the packages themselves.
