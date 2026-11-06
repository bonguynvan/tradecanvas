import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..');

/** The dialogs loaded when first opened, and the files only they use. */
const LAZY = new Set([
  'WidgetSettings',
  'settingsRows',
  'WidgetIndicatorSettings',
  'indicatorSettingsTabs',
  'WidgetDrawingSettings',
  'drawingSettingsTabs',
  'WidgetGoToDate',
  'WidgetHotkeySheet',
  'WidgetIndicatorPicker',
  'indicatorSearch',
  'WidgetCommandPalette',
  'WidgetSymbolSearch',
  'symbolSearchFilters',
  'symbolCell',
  'symbolBadge',
  'symbolMatch',
]);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

/** The modules a file imports for their values; `import type` brings no code along. */
function valueImports(code: string): string[] {
  const found: string[] = [];
  const re = /^\s*(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*'([^']+)'/gm;
  for (const m of code.matchAll(re)) {
    if (m[2]) continue;
    // `import { type A, type B }` is type-only too.
    const names = /^\{([^}]*)\}$/.exec(m[3].trim());
    if (names && names[1].split(',').every((n) => !n.trim() || n.trim().startsWith('type '))) continue;
    found.push(m[4]);
  }
  return found;
}

describe('dialogs loaded when first opened', () => {
  it('no file outside them brings their code in up front', () => {
    const offenders: string[] = [];
    for (const file of sources(SRC)) {
      const name = file.split(/[\\/]/).pop()!.replace(/\.ts$/, '');
      if (LAZY.has(name)) continue;
      for (const spec of valueImports(readFileSync(file, 'utf8'))) {
        const target = spec.split('/').pop()!.replace(/\.js$/, '');
        if (spec.startsWith('.') && LAZY.has(target)) offenders.push(`${name} -> ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
