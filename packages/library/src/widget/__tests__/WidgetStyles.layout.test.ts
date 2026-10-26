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

  // The arrow keys up the watchlist left its first symbol under the sticky header.
  it('scrolls a row the keyboard moves to in below the page’s header, as tall as the header', () => {
    const header = /min-height:\s*(calc\(var\(--tcw-space-6\) \+ var\(--tcw-space-5\)\))/.exec(panelRule('.tcw-dock-page > :is(.tcw-watchlist-header, .tcw-alerts-header, .tcw-tree-header, .tcw-datawin-header, .tcw-syminfo-header, .tcw-ladder-header)'));
    expect(header).not.toBeNull();
    expect(panelRule('.tcw-dock-panel > .tcw-dock-page')).toContain(`scroll-padding-block-start: ${header![1]}`);
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
