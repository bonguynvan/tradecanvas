import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (file: string) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
const css = read('WidgetStyles.css');
const dialogs = read('WidgetDialogs.css');

/** The declarations of a rule written once at the top level of the stylesheet. */
function rule(selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  // Its declarations only: comments may name what it must not have.
  return css.slice(at, css.indexOf('}', at)).replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Every block of `sheet` for `selector`, in a media query or not, its comments left out. */
const blocks = (sheet: string, selector: string) => [...sheet.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter((m) => m[1].split(',').some((s) => s.trim() === selector))
  .map((m) => m[2]);

/** The part of `sheet` in its `@media (max-width: 640px)` blocks: the phone's rules. */
const phone = (sheet: string) => sheet.split('@media (max-width: 640px)').slice(1).map((part) => part.slice(0, part.indexOf('\n}\n'))).join('\n');

describe('the widget’s own box', () => {
  // Hidden overflow still scrolls when the keyboard lands on what is past the edge ("more" pushed out
  // by a long layout name shifted the whole widget left until a resize); clipped overflow never does.
  it('clips what is past its edges, where the browser can, so focus never scrolls it', () => {
    const root = rule('.tcw-root');
    expect(root).toMatch(/overflow:\s*hidden;\s*overflow:\s*clip;/);
  });
});

describe('the toolbar’s symbol', () => {
  // "HYPERLIQUID:xyz:GOLD" on a 390 phone held its width and pushed "more" off the bar.
  it('gives way only when the fit squeezes it, its venue to an ellipsis before anything else shrinks', () => {
    expect(rule('.tcw-toolbar-symbol')).not.toMatch(/min-width|flex-shrink/);
    const symbol = rule(".tcw-toolbar[data-tcw-squeeze='venue'] > .tcw-toolbar-symbol--venue");
    expect(symbol).toMatch(/display:\s*inline-grid/);
    // The venue's column counts a letter and an ellipsis in the smallest width (never a sliver), the ticker all of itself.
    expect(symbol).toMatch(/grid-template-columns:\s*minmax\(2em, max-content\) auto/);
    expect(symbol).toMatch(/column-gap:\s*var\(--tcw-space-1\)/);
    expect(symbol).toMatch(/flex-shrink:\s*1000/);
    const venue = rule(".tcw-toolbar[data-tcw-squeeze='venue'] .tcw-toolbar-venue");
    expect(venue).toMatch(/min-width:\s*0/);
    expect(venue).toMatch(/overflow:\s*hidden/);
    expect(venue).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('then drops its venue, and last cuts its ticker short', () => {
    expect(blocks(css, ".tcw-toolbar[data-tcw-squeeze='ticker'] .tcw-toolbar-venue").join('')).toMatch(/display:\s*none/);
    expect(blocks(css, ".tcw-toolbar[data-tcw-squeeze='cut'] .tcw-toolbar-venue").join('')).toMatch(/display:\s*none/);
    expect(rule(".tcw-toolbar[data-tcw-squeeze='cut'] > .tcw-toolbar-symbol")).toMatch(/min-width:\s*0/);
    const ticker = rule(".tcw-toolbar[data-tcw-squeeze='cut'] .tcw-toolbar-ticker");
    expect(ticker).toMatch(/min-width:\s*0/);
    expect(ticker).toMatch(/text-overflow:\s*ellipsis/);
  });
});

describe('frosted menus', () => {
  // `ui.blur` above 0 (the Capsule look) shows the chart through every menu, blurred: the right-click
  // and "more" menus showed it sharp behind their words.
  it.each(['.tcw-dropdown', '.tcw-flyout', '.tcw-context-menu'])('blurs what is under %s', (selector) => {
    const declarations = rule(selector);
    expect(declarations).toMatch(/(?<!-)backdrop-filter:\s*blur\(var\(--tcw-blur\)\)/);
    expect(declarations).toMatch(/-webkit-backdrop-filter:\s*blur\(var\(--tcw-blur\)\)/);
  });
});

describe('the shortcut sheet', () => {
  // Columns on the box that scrolls, a fixed height, lay the groups past its height sideways, out of reach.
  it('lays its groups in columns on a block inside the scroller, never on the scroller', () => {
    expect(blocks(dialogs, '.tcw-hotkey-body').join('')).not.toMatch(/columns/);
    expect(blocks(dialogs, '.tcw-hotkey-body')[0]).toMatch(/overflow-y:\s*auto/);
    expect(blocks(dialogs, '.tcw-hotkey-columns')[0]).toMatch(/columns:\s*2/);
  });
});

describe('the dock', () => {
  const panels = read('WidgetPanels.css').replace(/\/\*[\s\S]*?\*\//g, '');
  /** The declarations of the top-level rule for exactly `selector` in the panels' stylesheet. */
  const panelRule = (selector: string) => {
    const at = panels.indexOf(`\n${selector} {`);
    expect(at, selector).toBeGreaterThan(-1);
    return panels.slice(at, panels.indexOf('}', at));
  };

  // A page scrolls under its header; the watchlist's own rule, as specific and later, hid its overflow,
  // so 34 symbols in a 768 px window could not be scrolled to, by wheel or by keyboard.
  it('lets the watchlist’s page scroll as every page does', () => {
    expect(panelRule('.tcw-dock-panel > .tcw-dock-page')).toMatch(/overflow-y:\s*auto/);
    expect(panelRule('.tcw-dock-panel > .tcw-watchlist')).not.toMatch(/overflow/);
  });

  // The arrow keys up the watchlist left its first symbol under the sticky header; then 1-1.5 px
  // under it, the padding 34 px and the header 35 with the rule under it.
  it('scrolls a row the keyboard moves to in below the page’s header, its rule too, from one height', () => {
    const page = panelRule('.tcw-dock-page');
    expect(page).toMatch(/--tcw-dock-head-h:\s*max\(calc\(var\(--tcw-space-6\) \+ var\(--tcw-space-5\)\), var\(--tcw-control-h\)\);/);
    expect(page).toMatch(/--tcw-dock-head-rule:\s*1px;/);
    const header = panelRule('.tcw-dock-page > :is(.tcw-watchlist-header, .tcw-alerts-header, .tcw-tree-header, .tcw-datawin-header, .tcw-syminfo-header, .tcw-ladder-header)');
    expect(header).toMatch(/min-height:\s*var\(--tcw-dock-head-h\);/);
    expect(header).toMatch(/padding-block:\s*0;/);
    expect(header).toMatch(/border-bottom:\s*var\(--tcw-dock-head-rule\) solid var\(--tcw-divider\);/);
    expect(panelRule('.tcw-dock-panel > .tcw-dock-page')).toMatch(/scroll-padding-block-start:\s*calc\(var\(--tcw-dock-head-h\) \+ var\(--tcw-dock-head-rule\)\);/);
  });
});

describe('the symbol search', () => {
  // Eight kinds at 1366 wrap "Perpetual" onto a line of its own: the exchange list stays on the first.
  it('keeps the exchange list on the kind tabs’ first line when they wrap', () => {
    expect(blocks(dialogs, '.tcw-ss-filters')[0]).toMatch(/align-items:\s*flex-start/);
  });

  // On a phone "OKX:BTC-USDT-SWAP" showed "BTC-USDT-S…" beside a name with room, and one long exchange
  // held the exchange column at 89 on every row.
  it('keeps a ticker whole on a phone before its name, a venue counting for nothing in its column', () => {
    const rules = phone(dialogs);
    expect(rules).toMatch(/\.tcw-ss-results\s*\{\s*grid-template-columns:\s*max-content fit-content\(min\(144px, 38\.2%\)\) minmax\(0, 1fr\) fit-content\(55px\) auto;/);
    expect(blocks(rules, '.tcw-ss-venue').join('')).toMatch(/width:\s*0;/);
    expect(blocks(rules, '.tcw-ss-symbol').join('')).toMatch(/justify-self:\s*stretch/);
  });
});

describe('the symbol search’s venue', () => {
  // On a phone "HYPERLIQ…GOLD": the venue's ellipsis touched the ticker. The cell reads left to right
  // in any widget, so the end margin is on the ticker's side both ways.
  it('keeps a gap between its ellipsis and the ticker', () => {
    expect(blocks(dialogs, '.tcw-ss-venue')[0]).toMatch(/margin-inline-end:\s*var\(--tcw-space-1\)/);
  });

  // On a phone, a search that leaves only short tickers with a venue ("HYPER") sized the column to
  // the ticker, and the venue showed as a sliver ("|GOLD", "H.GOLD").
  it('shows on a phone a letter and an ellipsis or nothing, never a sliver', () => {
    const rules = phone(dialogs);
    // Its basis, not a least width: that would widen the column for every row by the venue's 2em.
    expect(blocks(rules, '.tcw-ss-venue').join('')).toMatch(/flex:\s*1 1 2em/);
    const cell = blocks(rules, '.tcw-ss-symbol').join('');
    expect(cell).toMatch(/flex-wrap:\s*wrap/);
    expect(cell).toMatch(/flex-direction:\s*row-reverse/);
    expect(cell).toMatch(/height:\s*1lh/);
    expect(blocks(rules, '.tcw-ss-ticker').join('')).toMatch(/order:\s*-1/);
  });
});

describe('small boxes that scrolled a few px', () => {
  // Out to the menu's edges past its padding, the typed interval scrolled the menu 3 px both ways.
  it('takes the typed interval out to the timeframe menu’s edges and no further', () => {
    const custom = rule('.tcw-tf-custom');
    expect(custom).not.toMatch(/-6px/);
    expect(custom).toMatch(/bottom:\s*calc\(-1 \* var\(--tcw-menu-pad\)\)/);
    expect(custom).toMatch(/margin:\s*4px calc\(-1 \* var\(--tcw-menu-pad\)\) calc\(-1 \* var\(--tcw-menu-pad\)\)/);
  });

  // The first and last buttons' 1px margins added 2 px past the padding: at 1366 x 768 it scrolled by them.
  it('counts the drawing tools’ end margins in the sidebar’s padding', () => {
    expect(rule('.tcw-sidebar')).toMatch(/padding:\s*calc\(var\(--tcw-space-3\) - 1px\) 0/);
    expect(rule('.tcw-sidebar-btn')).toMatch(/margin:\s*1px 0/);
  });

  // Each value shrinking on its own cut all three of Bollinger's at once on a phone ("98… 98… 97…"):
  // as one line of text, the values before the cut stay whole and one ellipsis ends the line.
  it('ends a legend’s values in one ellipsis where a narrow chart cuts them, the values before it whole', () => {
    const box = rule('.tcw-ind-legend-values');
    expect(box).toMatch(/display:\s*block/);
    expect(box).toMatch(/min-width:\s*0/);
    expect(box).toMatch(/overflow:\s*hidden/);
    expect(box).toMatch(/text-overflow:\s*ellipsis/);
    expect(blocks(css, '.tcw-ind-legend-values > *').join('')).not.toMatch(/min-width|overflow|flex/);
    expect(rule('.tcw-ind-legend-values > * + *')).toMatch(/margin-inline-start:\s*var\(--tcw-space-4\)/);
  });

  // Hidden, not gone: the box keeps its room, so it is measured again and the values come back.
  it('hides a legend’s values with no room for a digit and an ellipsis, keeping their room', () => {
    const declarations = rule('.tcw-ind-legend-values--no-room');
    expect(declarations).toMatch(/visibility:\s*hidden/);
    expect(declarations).not.toMatch(/display/);
  });
});

describe('the dialogs’ layout rules', () => {
  // A dialog is a column with a height cap: a part of it with an overflow of its own loses its
  // minimum height, and a long body squashes it (1.16.0 squashed the Settings' tabs this way).
  it('keeps the tabs of a dialog their height, whatever its body holds', () => {
    const tabs = rule('.tcw-modal-tabs');
    expect(tabs).toMatch(/flex-shrink:\s*0/);
    expect(tabs).not.toMatch(/overflow/);
  });

  it('lets a narrow dialog span a phone screen like every sheet', () => {
    const at = css.indexOf('.tcw-modal-narrow {');
    expect(at).toBeGreaterThan(-1);
    const before = css.slice(0, at);
    expect(before.lastIndexOf('@media (min-width: 641px)')).toBeGreaterThan(before.lastIndexOf('}\n\n'));
  });
});

describe('a watchlist row’s remove button', () => {
  // Shown on focus from the keyboard (or on hover), it sat over the price and the change.
  it('has a column of its own after the numbers, never over them', () => {
    expect(rule('.tcw-watchlist-row.tcw-watchlist-removable')).toMatch(/grid-template-columns:\s*1fr auto auto var\(--tcw-watchlist-remove\)/);
    const button = rule('.tcw-watchlist-remove');
    expect(button).not.toMatch(/position:\s*absolute/);
    expect(button).toMatch(/width:\s*var\(--tcw-watchlist-remove\)/);
  });
});
