import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FIBONACCI } from '@tradecanvas/commons';
import { resolveWidgetUI, widgetUIVariables } from '../widgetUI.js';

// A Windows checkout may turn the file's line endings into CRLF.
const css = readFileSync(fileURLToPath(new URL('../WidgetStyles.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

/** Every `--tcw-*` declared in the first block matching `selector`, as written. */
function declared(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--tcw-[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** A token's value with the `var(--tcw-…)` it names filled in from the same block. */
function resolved(tokens: Record<string, string>, value: string): string {
  return value.replace(/var\((--tcw-[\w-]+)\)/g, (_, name: string) => resolved(tokens, tokens[name] ?? `var(${name})`));
}

/** The body of the rule whose selector is exactly `selector`. */
function ruleBody(selector: string): string {
  const m = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^{}]*)\\}`));
  if (!m) throw new Error(`no rule ${selector}`);
  return m[1];
}

describe('the stylesheet’s look', () => {
  const root = declared('.tcw-root {');

  it('defaults to Graphite: every token the `ui` option sets, at Graphite’s value', () => {
    const modern = widgetUIVariables(resolveWidgetUI());
    for (const [name, value] of Object.entries(modern)) {
      expect(root[name], name).toBeDefined();
      expect(resolved(root, root[name]), name).toBe(resolved(root, value));
    }
  });

  it('colours Modern as the editor it is drawn from, dark and light, at the specificity of the colours before it', () => {
    // `:where()` keeps the selectors as weak as `.tcw-root` and its light rule, so a page's own rule still wins a tie.
    const dark = declared(".tcw-root:where([data-tcw-ui='modern']) {");
    expect(dark).toMatchObject({
      '--tcw-bg': '#1f1f1f',
      '--tcw-bg-surface': '#181818',
      '--tcw-bg-elevated': '#252526',
      '--tcw-border': '#2b2b2b',
      '--tcw-text': '#cccccc',
      '--tcw-text-muted': '#9d9d9d',
      // The logo's amber for what you act on and pick, dark ink on it; a lighter amber as text.
      '--tcw-accent': '#f0a940',
      '--tcw-accent-fill': '#e8961e',
      '--tcw-accent-ink': '#1f1f1f',
    });
    const light = declared(".tcw-root[data-tcw-theme='light']:where([data-tcw-ui='modern']) {");
    expect(light).toMatchObject({
      '--tcw-bg': '#ffffff',
      '--tcw-bg-surface': '#f8f8f8',
      '--tcw-border': '#e5e5e5',
      '--tcw-text': '#3b3b3b',
      '--tcw-text-muted': '#616161',
      // Amber is too light as text on white: a deeper one there, the fill amber still.
      '--tcw-accent': '#8a5a10',
      '--tcw-accent-fill': '#e8961e',
      '--tcw-accent-ink': '#1f1f1f',
    });
    // A fill reads the fill token, so a look can tell text from fill; the others' fill is their accent.
    expect(css).not.toMatch(/background(?:-color)?: var\(--tcw-accent\)/);
    expect(root['--tcw-accent-fill']).toBe('var(--tcw-accent)');
    // After the colours it changes, so it wins over them.
    expect(css.indexOf(".tcw-root:where([data-tcw-ui='modern']) {")).toBeGreaterThan(css.indexOf(".tcw-root[data-tcw-theme='light'] {"));
    // Every colour the look before it sets, so none of them is left mixed in, but the kinds of symbol it shares.
    const colours = (tokens: Record<string, string>) => Object.keys(tokens).filter((name) => !/^--tcw-(kind-[13-5]|shadow-)/.test(name));
    const base = declared('.tcw-root {');
    const baseColours = colours(base).filter((name) => /^--tcw-(bg|border|tooltip|text|accent|red|green|hover|active|divider|kind)/.test(name) && !/-(w|radius|shadow)$/.test(name));
    expect(baseColours.filter((name) => !(name in dark))).toEqual([]);
    expect(colours(declared(".tcw-root[data-tcw-theme='light'] {")).filter((name) => !(name in light))).toEqual([]);
    // Its pick in the accent's fill, before the solid and underline switches, so a look of yours that asks for one gets it.
    const pick = css.indexOf(".tcw-root:where([data-tcw-ui='modern']) {\n  --tcw-on-bg: var(--tcw-accent-fill);");
    expect(pick).toBeGreaterThan(-1);
    expect(pick).toBeLessThan(css.indexOf(".tcw-root[data-tcw-active='solid'] {"));
    expect(pick).toBeLessThan(css.indexOf(".tcw-root[data-tcw-active='underline'] {"));
  });

  it('styles each layout switch the `ui` option sets', () => {
    for (const attr of [
      "[data-tcw-active='solid']",
      "[data-tcw-active='underline']",
      "[data-tcw-toolbar='floating']",
      "[data-tcw-sidebar='floating']",
      "[data-tcw-intervals='segmented']",
    ]) {
      expect(css.includes(`.tcw-root${attr}`), attr).toBe(true);
    }
  });

  it('marks a tool group with a triangle in its button’s corner, not a dot like the tools’ anchors', () => {
    const mark = ruleBody('.tcw-multi-dot');
    expect(mark).toMatch(/clip-path: polygon\(/);
    expect(mark).not.toContain('border-radius: 50%');
    // In the very corner, away from the icon, and in the other corner right to left.
    expect(mark).toContain('inset-block-end: 1px');
    expect(mark).toContain('inset-inline-end: 1px');
    expect(ruleBody("[dir='rtl'] .tcw-multi-dot")).toMatch(/clip-path: polygon\(/);
  });

  it('draws the icons’ lines at the look’s width, on the widget and in its portal, only when it sets one', () => {
    expect(ruleBody("[data-tcw-icon-stroke='set'] .tc-icon")).toContain('stroke-width: var(--tcw-icon-stroke)');
    // The same width at every icon size: the line isn't scaled with the drawing.
    expect(ruleBody("[data-tcw-icon-stroke='set'] .tc-icon > *")).toContain('vector-effect: non-scaling-stroke');
    // Its filled dots (a tool's anchors) shrink with the line, so they don't outweigh it.
    expect(ruleBody("[data-tcw-icon-stroke='set'] .tc-icon > circle[stroke='none']")).toMatch(/transform: scale\(0\.\d+\)/);
    // A small icon is no heavier than the rest: drawn as it is, its line was under 1 px.
    expect(ruleBody("[data-tcw-icon-stroke='set'] .tc-icon:is([width='10'], [width='11'], [width='12'], [width='13'])"))
      .toContain('stroke-width: min(var(--tcw-icon-stroke), 1px)');
  });

  it('draws the chart type’s icon at the size of the other toolbar icons', () => {
    expect(ruleBody(".tcw-dropdown-trigger[data-role='charttype'] svg")).toContain('width: var(--tcw-icon)');
  });

  it('sets the small labels at the look’s label size', () => {
    for (const sel of ['.tcw-dropdown-label', '.tcw-flyout-header', '.tcw-settings-section-title']) {
      expect(ruleBody(sel), sel).toContain('font-size: var(--tcw-label-size)');
    }
  });

  it('sizes the bars and their controls by the tokens', () => {
    expect(ruleBody('.tcw-toolbar')).toContain('height: var(--tcw-toolbar-h)');
    expect(ruleBody('.tcw-sidebar')).toContain('width: var(--tcw-sidebar-w)');
    expect(ruleBody('.tcw-btn')).toContain('height: var(--tcw-control-h)');
    expect(ruleBody('.tcw-btn-icon')).toContain('height: var(--tcw-control-h)');
    // The drawing tools take their own size, never wider than their column leaves room for.
    expect(ruleBody('.tcw-sidebar-btn')).toContain('height: var(--tcw-tool-size)');
    // Declared on the column too, so a short one's fit (set on it) reaches its buttons.
    const tool = ruleBody('.tcw-root, .tcw-sidebar');
    expect(tool).toMatch(/--tcw-tool-size: min\(var\(--tcw-tool-h\), calc\(var\(--tcw-sidebar-w\) - \d+px\), var\(--tcw-tool-fit, \d+px\)\);/);
    expect(tool).toMatch(/--tcw-tool-icon-size: min\(var\(--tcw-tool-icon\), /);
    expect(ruleBody('.tcw-sidebar-btn svg')).toContain('width: var(--tcw-tool-icon-size)');
    // A tool menu opens at the column's edge; the pointer on its way there from a button crosses the
    // column's side room, so the group's hover area spans it and the menu leaves no gap after it
    // (a slow move through a 16 px gap closed the menu).
    expect(ruleBody('.tcw-tool-group-wrap')).toMatch(/align-self:\s*stretch;/);
    expect(ruleBody('.tcw-tool-group-wrap')).toMatch(/justify-content:\s*center;/);
    expect(ruleBody('.tcw-flyout')).not.toMatch(/margin-inline-start:\s*[1-9]/);
    // The cursor's glyph sits straight in its button: the browser's padding squeezed it to 14 of 16.
    expect(ruleBody('.tcw-sidebar-btn')).toContain('padding: 0;');
    expect(ruleBody('.tcw-sidebar-btn svg')).toContain('flex: none;');
    // The dock's rail, as wide as the tools on the other side, has buttons as theirs.
    const panels = readFileSync(fileURLToPath(new URL('../WidgetPanels.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
    expect(panels.match(/\n\.tcw-dock-btn \{([^{}]*)\}/)?.[1]).toContain('height: var(--tcw-tool-size)');
    expect(ruleBody('.tcw-dropdown-item')).toContain('min-height: var(--tcw-menu-item-h)');
    expect(ruleBody('.tcw-toolbar-sep')).toContain('width: var(--tcw-sep-w)');
    // The drawing tools' sections keep a hairline even where the toolbar drops its rules.
    expect(ruleBody('.tcw-sidebar-divider')).toContain('height: max(1px, var(--tcw-sep-w))');
  });

  it('gives each kind of part its own corners', () => {
    expect(ruleBody('.tcw-btn')).toContain('border-radius: var(--tcw-control-radius)');
    expect(ruleBody('.tcw-dropdown')).toContain('border-radius: var(--tcw-menu-radius)');
    expect(ruleBody('.tcw-modal')).toContain('border-radius: var(--tcw-dialog-radius)');
    expect(ruleBody('.tcw-alerts-panel')).toContain('border-radius: var(--tcw-panel-radius)');
    expect(ruleBody('.tcw-tooltip')).toContain('border-radius: var(--tcw-tooltip-radius)');
    expect(ruleBody('.tcw-toast')).toContain('border-radius: var(--tcw-toast-radius)');
  });

  it('sets type by the tokens: no type size or weight of its own', () => {
    const own = [...css.matchAll(/(?<![\w-])(?:font-size:\s*\d[\d.]*px|font-weight:\s*[5-7]\d\d\b)/g)].map((m) => m[0]);
    expect(own).toEqual([]);
  });

  it('reads only variables something declares', () => {
    const declaredAnywhere = new Set([...css.matchAll(/(--tcw-[\w-]+)\s*:/g)].map((m) => m[1]));
    // The look's tokens, and the few the widget's code sets on an element itself.
    const dir = fileURLToPath(new URL('..', import.meta.url));
    const code = readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
    const set = new Set([
      ...Object.keys(widgetUIVariables(resolveWidgetUI())),
      ...[...code.matchAll(/setProperty\('(--tcw-[\w-]+)'/g)].map((m) => m[1]),
    ]);
    // Read without a fallback, so a missing one would drop the declaration.
    const read = new Set([...css.matchAll(/var\((--tcw-[\w-]+)\)/g)].map((m) => m[1]));
    expect([...read].filter((name) => !declaredAnywhere.has(name) && !set.has(name))).toEqual([]);
  });

  it('turns on no OpenType features but the ones its token names: none, unless your CSS sets it', () => {
    const dir = fileURLToPath(new URL('..', import.meta.url));
    const sheets = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
    // A list here would replace the token's on that part, and tags mean something else in each face.
    const lists = [...sheets.matchAll(/font-feature-settings:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(new Set(lists)).toEqual(new Set(['var(--tcw-font-features)', 'inherit']));
    expect(ruleBody('.tcw-root')).toContain('font-feature-settings: var(--tcw-font-features);');
    // The browser's control font resets them: the buttons and fields take the token through inherit.
    const controls = sheets.match(/:where\(\.tcw-root\) :where\(input, select, textarea, button\) \{([^{}]*)\}/);
    expect(controls?.[1]).toContain('font-feature-settings: inherit;');
    expect(root['--tcw-font-features']).toBe('normal');
    // Only the stylesheet declares it, so a rule of yours on .tcw-root sets it with the `ui` option or without.
    for (const preset of ['print', 'studio', 'terminal', 'capsule'] as const) {
      expect(widgetUIVariables(resolveWidgetUI(preset)), preset).not.toHaveProperty('--tcw-font-features');
    }
  });

  it('uses every token the look sets', () => {
    // In any of the widget's stylesheets: a token may be used in the dialogs' or the panels' alone.
    const dir = fileURLToPath(new URL('..', import.meta.url));
    const sheets = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join(' ');
    const unused = Object.keys(widgetUIVariables(resolveWidgetUI())).filter(
      (name) => !sheets.includes(`var(${name})`) && !sheets.includes(`var(${name},`),
    );
    expect(unused).toEqual([]);
  });

  it('places its panels below the toolbar and beside the drawing tools, as the look sizes them', () => {
    // The floating panels (the depth ladder is a page of the dock: it has no place of its own).
    for (const panel of ['.tcw-alerts-panel', '.tcw-datawin', '.tcw-tree-panel']) {
      expect(ruleBody(panel), panel).toContain('top: var(--tcw-panel-top)');
    }
    expect(ruleBody('.tcw-style-panel')).toContain('inset-inline-start: var(--tcw-panel-left)');
  });

  it('keeps tap targets on phones: the variants’ sizes give way under 768 px', () => {
    const variants = css.slice(css.indexOf('/* === The look:'));
    const phone = variants.slice(variants.indexOf('@media (max-width: 768px)'));
    expect(phone.length).toBeLessThan(variants.length);
    expect(phone).toContain(".tcw-root[data-tcw-intervals='segmented'] > .tcw-toolbar > .tcw-tf-group .tcw-btn");
    expect(phone).toContain(".tcw-root[data-tcw-toolbar='floating'] > .tcw-toolbar");
  });

  it('writes directions logically, so a right-to-left widget mirrors', () => {
    const physical = [...css.matchAll(/(?<![\w-])(?:text-align:\s*(?:left|right)|border-(?:left|right)(?:-color)?:|margin-(?:left|right):\s*auto)/g)].map((m) => m[0]);
    expect(physical).toEqual([]);
  });

  it('spaces by Fibonacci numbers on a 4 px grid, with 2 and 6 under them: every step even', () => {
    const space = Object.entries(root).filter(([name]) => name.startsWith('--tcw-space-')).map(([, value]) => parseFloat(value));
    expect(space).toEqual([2, 4, 6, 8, 12, 20, 32]);
    expect(space.slice(1).filter((n) => n % 4 === 0).map((n) => n / 4)).toEqual((FIBONACCI as readonly number[]).slice(0, 5));
    for (const n of space) expect(n % 2, String(n)).toBe(0);
  });

  it('pads its controls, bars and menu rows by the token for it, a step up the spacing', () => {
    expect([root['--tcw-control-pad'], root['--tcw-bar-pad'], root['--tcw-menu-row-pad']]).toEqual(['12px', '12px', '12px']);
    expect(ruleBody('.tcw-toolbar')).toContain('padding: 0 var(--tcw-bar-pad)');
    for (const control of ['.tcw-btn', '.tcw-dropdown-trigger', '.tcw-toolbar-symbol']) expect(ruleBody(control), control).toContain('padding: 0 var(--tcw-control-pad)');
    for (const row of ['.tcw-dropdown-item', '.tcw-flyout-item', '.tcw-context-item']) expect(ruleBody(row), row).toContain('var(--tcw-menu-row-pad)');
  });

  it('rounds the bars’ text buttons up to whole pixels, with no specificity', () => {
    expect(root['--tcw-text-w']).toBe('calc-size(max-content, round(up, size, 1px))');
    expect(css).toMatch(/:where\([^)]*\.tcw-toolbar \.tcw-btn[^)]*\) \{\n  width: var\(--tcw-text-w, auto\);/);
  });

  it('nests a menu’s corners: its rows’ corner is its own less its padding', () => {
    expect(css).toContain('--tcw-menu-item-radius: max(0px, calc(var(--tcw-menu-radius) - var(--tcw-menu-pad)))');
    for (const menu of ['.tcw-dropdown', '.tcw-flyout', '.tcw-context-menu']) {
      expect(ruleBody(menu), menu).toContain('padding: var(--tcw-menu-pad)');
    }
    for (const row of ['.tcw-dropdown-item', '.tcw-flyout-item', '.tcw-context-item']) {
      expect(ruleBody(row), row).toContain('border-radius: var(--tcw-menu-item-radius)');
    }
  });

  it('shows a chosen button by the look’s tokens', () => {
    expect(ruleBody('.tcw-btn.tcw-active')).toContain('background: var(--tcw-on-bg)');
    expect(ruleBody('.tcw-sidebar-btn.tcw-active')).toContain('background: var(--tcw-on-icon-bg)');
  });
});

describe('the symbol search on a phone', () => {
  it('writes the exchange whole under the ticker, as the row’s second line, not cut in a narrow column', () => {
    const css = readFileSync(fileURLToPath(new URL('../WidgetDialogs.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
    const phone = css.slice(css.indexOf('/* A phone: both are the widget'));
    const escaped = (selector: string) => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rule = (selector: string) => phone.match(new RegExp(`\n  ${escaped(selector)} \\{([^{}]*)\\}`))?.[1] ?? '';
    expect(rule('.tcw-ss-exchange')).toContain('grid-column: 2');
    expect(rule('.tcw-ss-exchange')).toContain('grid-row: 2');
    expect(rule('.tcw-ss-exchange')).not.toContain('text-overflow');
    expect(phone).not.toContain('fit-content(55px)');
  });

  it('draws Graphite’s tick box over the light theme’s switch: its rules are as specific', () => {
    const controls = readFileSync(fileURLToPath(new URL('../WidgetControls.css', import.meta.url)), 'utf8');
    expect(controls).toContain(".tcw-root[data-tcw-ui='graphite'] .tcw-toggle.tcw-on::after");
    expect(controls).not.toContain(".tcw-root:where([data-tcw-ui='graphite']) .tcw-toggle");
  });
});

// Graphite groups by room, not by rules: a divider inside a group is left as its room alone.
describe('Graphite’s dividers', () => {
  it('draws no rule for a divider inside a group of the toolbar, or between the drawing tools’ sections', () => {
    expect(ruleBody(".tcw-root[data-tcw-ui='graphite'] .tcw-toolbar-sep--minor")).toContain('background: transparent');
    // A split button's corner mark stays while its menu is open, the pointer gone from it.
    expect(css).toContain(":has(> [aria-expanded='true'])) .tcw-sidebar-menu-btn::after");
    // The tools stand at one pitch: the divider between two sections takes no room either.
    expect(ruleBody(".tcw-root[data-tcw-ui='graphite'] .tcw-sidebar-divider--section")).toContain('display: none');
  });
});

// DESIGN.md's rules for Graphite, held where a stylesheet can be read.
describe('Graphite’s rules', () => {
  const read = (name: string) => readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
  const body = (sheet: string, selector: string) => {
    const at = sheet.indexOf(`\n${selector} {`);
    if (at < 0) throw new Error(`no rule ${selector}`);
    return sheet.slice(sheet.indexOf('{', at) + 1, sheet.indexOf('}', at));
  };

  it('says a field’s focus on its own line, with no ring and no glow around it', () => {
    const controls = read('WidgetControls.css');
    const at = controls.indexOf(".tcw-root[data-tcw-ui='graphite'] :is(.tcw-indi-input, .tcw-settings-select, .tcw-tf-custom-input, .tcw-watchlist-input, .tcw-style-name, .tcw-tree-rename):is(:focus, :focus-visible)");
    expect(at).toBeGreaterThan(0);
    const rule = controls.slice(at, controls.indexOf('}', at));
    expect(rule).toContain('border-color: var(--tcw-text-muted)');
    expect(rule).toContain('box-shadow: none');
    expect(rule).toContain('outline: none');
  });

  it('keeps a mark of the keys’ focus where it takes the ring away: one choice, the stepper in forced colours, a wrong figure’s red', () => {
    const controls = read('WidgetControls.css');
    // One choice read as text is still reached by the keys: its ring is the segment's own.
    expect(body(controls, ".tcw-root[data-tcw-ui='graphite'] .tcw-segmented > .tcw-segment:only-child")).not.toContain('box-shadow');
    const forced = controls.slice(controls.lastIndexOf('@media (forced-colors: active)', controls.indexOf('One choice is nothing to choose')));
    expect(forced.slice(0, forced.indexOf('\n}'))).toContain(".tcw-root[data-tcw-ui='graphite'] .tcw-stepper:focus-within");
    expect(controls).toContain(".tcw-root[data-tcw-ui='graphite'] .tcw-bracket-quantity[data-invalid] .tcw-stepper:focus-within { border-color: var(--tcw-red); }");
    // Every field's line in focus, by the one token the fields share.
    expect(controls.match(/--tcw-field-line-focus: var\(--tcw-text-muted\);/g)).toHaveLength(2);
  });

  it('rings what the keys reach in the text’s colour, not the accent’s', () => {
    const rule = body(css, ".tcw-root[data-tcw-ui='graphite'] :is(.tcw-ind-legend-name, .tcw-ind-legend-act, .tcw-ind-legend-toggle, .tcw-level-remove, .tcw-status-host-btn):focus-visible");
    expect(rule).toContain('outline-color: var(--tcw-text)');
  });

  it('puts no border on a filled or a neutral button: New order, like Cancel', () => {
    const rule = body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-account-new");
    expect(rule).toContain('border: 0');
    expect(rule).toContain('background: var(--tcw-active-bg)');
  });

  it('fills no button with the accent: its fill, its ink and its tint are the text’s colour, the ground’s and the picked ground', () => {
    // The look has several rules of this selector: the one that holds the accent's tokens.
    const at = css.indexOf('--tcw-accent-fill: var(--tcw-text)');
    expect(at).toBeGreaterThan(0);
    const tokens = css.slice(css.lastIndexOf('{', at), css.indexOf('}', at));
    expect(css.slice(css.lastIndexOf('}', at), at)).toContain(".tcw-root[data-tcw-ui='graphite'] {");
    expect(tokens).toContain('--tcw-accent-fill: var(--tcw-text)');
    expect(tokens).toContain('--tcw-accent-ink: var(--tcw-bg)');
    expect(tokens).toContain('--tcw-accent-soft: var(--tcw-active-bg)');
    // The accent itself stays: a link, and what is the user's own on the chart.
    expect(tokens).not.toMatch(/--tcw-accent:\s/);
    // A picked tab has no line of the accent under it.
    expect(css).toContain(".tcw-root[data-tcw-ui='graphite']:not([data-tcw-active='underline']) .tcw-account-tab[aria-selected='true']:not(:focus-visible),");
    // A filled button's ring stands off its fill: in the fill's colour against it, it was not seen.
    expect(css).toContain(".tcw-root[data-tcw-ui='graphite'] :is(.tcw-done-btn, .tcw-alerts-add, .tcw-style-savebtn, .tcw-replay-btn.tcw-replay-play):focus-visible {");
  });

  it('marks what is picked without the accent: the dark picked ground, the calendar’s day and the alerts panel’s open button', () => {
    // The dark theme's picked ground: a muted figure on it reads at 4.5:1 (it was #2b2d33, at 4.48).
    expect(css).toContain('--tcw-active-bg: #2a2c32;');
    const controls = readFileSync(fileURLToPath(new URL('../WidgetControls.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
    const day = body(controls, ".tcw-root[data-tcw-ui='graphite'] .tcw-calendar-day[aria-selected='true']");
    expect(day).toContain('background: var(--tcw-text)');
    expect(day).not.toContain('accent');
    expect(body(controls, ".tcw-root[data-tcw-ui='graphite'] .tcw-calendar-day.tcw-today")).toContain('color: var(--tcw-text)');
    const open = body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-alerts-header .tcw-alerts-new[aria-expanded='true']");
    expect(open).toContain('background: var(--tcw-active-bg)');
    expect(open).toContain('color: var(--tcw-text)');
  });

  it('writes a tab’s count as a plain number, and a total as a muted name and its figure', () => {
    expect(body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-account-count")).toContain('background: none');
    // On the picked tab's ground the muted text is under 4.5:1.
    expect(body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-account-count")).toContain('color: var(--tcw-text-dim)');
    // A figure of no direction is read as any figure is.
    expect(body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-account-total:not(.tcw-account-up, .tcw-account-down) .tcw-account-total-figure")).toContain('color: var(--tcw-text)');
    expect(body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-account-total-sep")).toContain('display: none');
    expect(body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-account-total-name")).toContain('color: var(--tcw-text-muted)');
    expect(body(css, ".tcw-root[data-tcw-ui='graphite'] .tcw-account-open")).toContain('order: -1');
  });

  it('draws the ticket’s one line solid, and a single choice as text', () => {
    const dialogs = read('WidgetDialogs.css');
    expect(body(dialogs, ".tcw-root[data-tcw-ui='graphite'] .tcw-ticket-summary:not(:empty)")).toContain('border-top-style: solid');
    expect(body(read('WidgetControls.css'), ".tcw-root[data-tcw-ui='graphite'] .tcw-segmented:has(> .tcw-segment:only-child)")).toContain('background: none');
  });
});
