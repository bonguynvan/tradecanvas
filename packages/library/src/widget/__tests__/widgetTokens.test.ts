import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A Windows checkout may turn the file's line endings into CRLF.
const css = readFileSync(fileURLToPath(new URL('../WidgetStyles.css', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

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

  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: a kind colour reads on its own tint in the symbol search', (_name, t) => {
    for (let slot = 1; slot <= 5; slot++) {
      const name = `--tcw-kind-${slot}`;
      expect(t[name], name).toMatch(/^#[0-9a-f]{6}$/i);
      // The badge is the colour at 16% over the dialog's surface, its letter the colour itself.
      expect(contrast(t[name], mix(t[name], t['--tcw-bg-elevated'], 0.16)), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('symbol kind colours', () => {
  /** Below this distance in OKLab two colours read as one at a badge's size (a just-noticeable step is about 0.02). */
  const APART = 0.1;

  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: every two kinds are told apart', (_name, t) => {
    for (let a = 1; a <= 5; a++) {
      for (let b = a + 1; b <= 5; b++) {
        const pair = `--tcw-kind-${a} / --tcw-kind-${b}`;
        expect(distance(t[`--tcw-kind-${a}`], t[`--tcw-kind-${b}`]), pair).toBeGreaterThanOrEqual(APART);
      }
    }
  });

  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: a kind is told apart from the accent and the up and down colours', (_name, t) => {
    // The accent marks the chart's symbol and what matched; green and red say up and down.
    for (let slot = 1; slot <= 5; slot++) {
      for (const meaning of ['--tcw-accent', '--tcw-green', '--tcw-red']) {
        const pair = `--tcw-kind-${slot} / ${meaning}`;
        expect(distance(t[`--tcw-kind-${slot}`], t[meaning]), pair).toBeGreaterThanOrEqual(APART);
      }
    }
  });
});

describe('symbol search styles', () => {
  const dialogs = readFileSync(fileURLToPath(new URL('../WidgetDialogs.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  /** The innermost rules, selector and body, of the symbol search and the compare dialog (`.tcw-ss…`). */
  const rules = [...dialogs.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].includes('.tcw-ss'));

  it('write every colour through a token, the kind tabs’ fade too', () => {
    expect(rules.length).toBeGreaterThan(0);
    const literal = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(|(?<![-\w])(?:black|white)(?![-\w])/i;
    const offending = rules.filter((m) => literal.test(m[2])).map((m) => m[1].trim());
    expect(offending).toEqual([]);
  });
});

/** How far apart two colours look: the straight distance between them in OKLab. */
function distance(a: string, b: string): number {
  const [x, y] = [oklab(a), oklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

function oklab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** `fg` at `alpha` over `bg`, as `color-mix(in srgb, fg alpha, transparent)` is drawn on it. */
function mix(fg: string, bg: string, alpha: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(channel(fg, i) * alpha + channel(bg, i) * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
}

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
