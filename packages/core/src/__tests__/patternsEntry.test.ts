import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as detect from '../indicators/candles/detect.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = resolve(SRC, '..');
const ENTRY = join(SRC, 'patterns/index.ts');

/** The relative specifiers a file imports: `import … from`, `export … from`, `import './x'` and `import('./x')`. */
const RELATIVE_IMPORT = /(?:(?:import|export)[^'"]*?from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g;

/** Every source file `file` reaches through its relative imports, itself included. */
function reached(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  const code = readFileSync(file, 'utf8');
  for (const [, spec] of code.matchAll(RELATIVE_IMPORT)) {
    reached(resolve(dirname(file), spec.replace(/\.js$/, '.ts')), seen);
  }
  return seen;
}

describe('@tradecanvas/core/patterns', () => {
  it('is an entry of the package of its own, for pages that detect patterns and draw no chart', () => {
    const { exports } = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8'));
    expect(exports['./patterns']).toEqual({
      types: './dist/patterns/index.d.ts',
      import: './dist/patterns/index.js',
      require: './dist/patterns/index.cjs',
    });
  });

  it('gives the same detector and list as the package’s main entry', async () => {
    expect(existsSync(ENTRY)).toBe(true);
    const entry = await import('../patterns/index.js');
    expect(entry.detectCandlePatterns).toBe(detect.detectCandlePatterns);
    expect(entry.CANDLE_PATTERNS).toBe(detect.CANDLE_PATTERNS);
  });

  it('reaches none of the engine: only the candle patterns’ own files', () => {
    expect(existsSync(ENTRY)).toBe(true);
    const outside = [...reached(ENTRY)]
      .map((f) => f.slice(SRC.length + 1).replace(/\\/g, '/'))
      .filter((f) => !f.startsWith('indicators/candles/') && f !== 'patterns/index.ts');
    expect(outside).toEqual([]);
  });
});
