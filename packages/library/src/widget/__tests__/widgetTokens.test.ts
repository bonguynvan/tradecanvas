import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../WidgetStyles.css', import.meta.url)), 'utf8');

/** `--tcw-*` custom properties declared in the first block matching `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--tcw-[\w-]+):\s*(#[0-9a-f]{6})\b/gi)) out[m[1]] = m[2];
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const dark = tokens('.tcw-root {');
const light = { ...dark, ...tokens(".tcw-root[data-tcw-theme='light'] {") };

describe('widget colour tokens', () => {
  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: text on an accent fill reads at 4.5:1', (_name, t) => {
    expect(contrast(t['--tcw-accent-ink'], t['--tcw-accent'])).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: accent, green and red read as text on the widget ground', (_name, t) => {
    for (const name of ['--tcw-accent', '--tcw-green', '--tcw-red']) {
      expect(contrast(t[name], t['--tcw-bg']), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: muted text stays readable', (_name, t) => {
    expect(contrast(t['--tcw-text-muted'], t['--tcw-bg'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('loading overlay styles', () => {
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  const block = reduced.slice(0, reduced.indexOf('\n}\n') + 2);

  it('keeps an animation when motion is reduced, without sliding anything', () => {
    expect(block).toMatch(/\.tcw-loading-candle\s*{[^}]*animation:\s*tcw-candle-glow/);
    expect(block).not.toMatch(/translate/);
    expect(css).toMatch(/@keyframes tcw-candle-glow\s*{[^@]*opacity[^@]*}/);
    // The widget-wide reduced-motion reset must leave the loader running.
    expect(css).toMatch(/\.tcw-root \.tcw-loading-candle,[^{]*{[^}]*animation-iteration-count:\s*infinite !important/);
  });

  it('never shows the loading text, only an error', () => {
    expect(block).not.toMatch(/\.tcw-loading-label/);
    expect(css).toMatch(/\.tcw-loading-overlay--error \.tcw-loading-label\s*{[^}]*position:\s*static/);
  });
});
