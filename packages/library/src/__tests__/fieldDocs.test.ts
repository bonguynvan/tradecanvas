import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * A field's note is a doc comment (`/** … *\/`) above it, never a `//` at the
 * end of its line: the published types keep the one and drop the other, so
 * an editor's hover, and an agent reading the `.d.ts`, never see what the
 * `//` said (what `interval` and `speed` mean in a replay, a default, a unit).
 */
const PACKAGES = join(__dirname, '..', '..', '..');
const SOURCES = ['commons/src', 'core/src', 'library/src', 'analytics/src'];
/**
 * `name: Type; // note`, with modifiers (`readonly`, `public`, `static` …), a
 * quoted name (`'toolbar.screenshot'`) or a function type. A private field
 * is the class's own, and not published.
 */
const FIELD_WITH_LINE_NOTE = /^\s+((?:public|protected|static|override|abstract|declare|readonly)\s+)*(['"][^'"]+['"]|[\w$]+)\??\s*:\s*[^;]*;\s*\/\//;
/** A member of a union of names with its note after it: `| 'snapshot' // …`. */
const MEMBER_WITH_LINE_NOTE = /^\s+\|\s*['"][^'"]*['"];?\s*\/\//;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path);
    return /\.ts$/.test(name) && !/\.(test|bench)\.ts$/.test(name) ? [path] : [];
  });
}

describe('field notes', () => {
  it('are doc comments, which the published types keep', () => {
    const found: string[] = [];
    for (const dir of SOURCES) {
      for (const file of files(join(PACKAGES, dir))) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          const field = FIELD_WITH_LINE_NOTE.exec(line);
          // `default: return x; // …` in a switch is a label, not a field.
          const noted = (field && field[2] !== 'default') || MEMBER_WITH_LINE_NOTE.test(line);
          if (noted) found.push(`${relative(PACKAGES, file)}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(found).toEqual([]);
  });
});
