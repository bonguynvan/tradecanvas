import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../WidgetStyles.css', import.meta.url)), 'utf8');

/** The declarations of a rule written once at the top level of the stylesheet. */
function rule(selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  // Its declarations only: comments may name what it must not have.
  return css.slice(at, css.indexOf('}', at)).replace(/\/\*[\s\S]*?\*\//g, '');
}

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
