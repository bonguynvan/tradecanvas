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

  it('defaults to Print: every token the `ui` option sets, at Print’s value', () => {
    const print = widgetUIVariables(resolveWidgetUI('print'));
    for (const [name, value] of Object.entries(print)) {
      expect(root[name], name).toBeDefined();
      expect(resolved(root, root[name]), name).toBe(resolved(root, value));
    }
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
    const unused = Object.keys(widgetUIVariables(resolveWidgetUI())).filter(
      (name) => !css.includes(`var(${name})`) && !css.includes(`var(${name},`),
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

  it('spaces by Fibonacci numbers', () => {
    const space = Object.entries(root).filter(([name]) => name.startsWith('--tcw-space-'));
    expect(space.length).toBeGreaterThan(5);
    for (const [name, value] of space) expect((FIBONACCI as readonly number[]).includes(parseFloat(value)), name).toBe(true);
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
