import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Icons come from the TradeCanvas icon set, never from emoji or symbol
 * characters: those draw differently on every system and font. Key names in
 * text (Shift+←, ⌘) and typography (…, × in "3 × 4") are text, not icons.
 */
const PACKAGES = join(__dirname, '..', '..', '..');
const SOURCES = ['commons/src', 'core/src', 'library/src'];
/**
 * Emoji (pictographs, flags, enclosed letters, the variation selector and
 * joiner), dingbats, shapes and stars, and symbols standing in for icons:
 * ⌕, ⏎, ⌚, media keys, ℹ, kebabs and burgers (⋮ ⋯ ≡).
 */
const ICON_CHARACTERS = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}\u{2315}\u{231A}\u{231B}\u{23CE}\u{23E9}-\u{23FA}\u{2139}\u{FE0F}\u{200D}\u{22EE}\u{22EF}\u{2261}]/u;
/** The same written as an HTML entity or a JS escape: a star, a check, a cross mark, a bell. */
const ESCAPED_ICONS = /&#(9733|9734|10003|10004|10005|10006|128276);|&(starf|check|cross);|\\u\{?(2605|2606|2713|2714|2715|2716|1F514)\}?/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path);
    return /\.(ts|css)$/.test(name) && !/\.(test|bench)\.ts$/.test(name) ? [path] : [];
  });
}

/**
 * The line without its comments: what a comment says is not on screen. A
 * `//` only starts one after a space or at the start, so a URL's stays.
 */
const code = (line: string) => (/^\s*(\/\/|\*|\/\*)/.test(line)
  ? ''
  : line.replace(/\/\*.*?\*\//g, '').replace(/(^|\s)\/\/.*$/, ''));

describe('icons', () => {
  it('are drawn from the icon set, not emoji or symbol characters', () => {
    const found: string[] = [];
    for (const dir of SOURCES) {
      for (const file of files(join(PACKAGES, dir))) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          const text = code(line);
          if (ICON_CHARACTERS.test(text) || ESCAPED_ICONS.test(text)) found.push(`${relative(PACKAGES, file)}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(found).toEqual([]);
  });
});
