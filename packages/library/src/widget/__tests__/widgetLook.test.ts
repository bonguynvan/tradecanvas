import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

  it('defaults to Studio: every token the `ui` option sets, at Studio’s value', () => {
    const studio = widgetUIVariables(resolveWidgetUI('studio'));
    for (const [name, value] of Object.entries(studio)) {
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

  it('sizes the bars and their controls by the tokens', () => {
    expect(ruleBody('.tcw-toolbar')).toContain('height: var(--tcw-toolbar-h)');
    expect(ruleBody('.tcw-sidebar')).toContain('width: var(--tcw-sidebar-w)');
    expect(ruleBody('.tcw-btn')).toContain('height: var(--tcw-control-h)');
    expect(ruleBody('.tcw-btn-icon')).toContain('height: var(--tcw-control-h)');
    expect(ruleBody('.tcw-sidebar-btn')).toContain('height: var(--tcw-control-h)');
    expect(ruleBody('.tcw-dropdown-item')).toContain('min-height: var(--tcw-menu-item-h)');
    expect(ruleBody('.tcw-toolbar-sep')).toContain('width: var(--tcw-sep-w)');
    expect(ruleBody('.tcw-sidebar-divider')).toContain('height: var(--tcw-sep-w)');
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

  it('shows a chosen button by the look’s tokens', () => {
    expect(ruleBody('.tcw-btn.tcw-active')).toContain('background: var(--tcw-on-bg)');
    expect(ruleBody('.tcw-sidebar-btn.tcw-active')).toContain('background: var(--tcw-on-icon-bg)');
  });
});
