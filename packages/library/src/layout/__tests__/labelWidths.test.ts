// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { LabelWidths } from '../labelWidths.js';

/** The most widths the cache keeps before it starts again. */
const KEPT = 512;
const FONT = '11px sans-serif';

/** A measure that counts its calls: 6 px a character. */
function counting(): { measure: (text: string) => () => number; calls: string[] } {
  const calls: string[] = [];
  return { calls, measure: (text) => () => { calls.push(text); return text.length * 6; } };
}

afterEach(() => {
  delete (document as { fonts?: FontFaceSet }).fonts;
});

describe('LabelWidths', () => {
  it('measures a label once for each font', () => {
    const widths = new LabelWidths();
    const { measure, calls } = counting();
    expect(widths.get('100.00', FONT, measure('100.00'))).toBe(36);
    expect(widths.get('100.00', FONT, measure('100.00'))).toBe(36);
    widths.get('100.00', 'bold 11px sans-serif', measure('100.00'));
    expect(calls).toEqual(['100.00', '100.00']);
  });

  it(`keeps ${KEPT} widths, and starts again on the next new one`, () => {
    const widths = new LabelWidths();
    const { measure, calls } = counting();
    for (let i = 0; i < KEPT; i++) widths.get(String(i), FONT, measure(String(i)));
    // All of them are still kept: the first is not measured again.
    widths.get('0', FONT, measure('0'));
    expect(calls).toHaveLength(KEPT);
    // One more clears the rest, keeping only itself.
    widths.get(String(KEPT), FONT, measure(String(KEPT)));
    widths.get(String(KEPT), FONT, measure(String(KEPT)));
    expect(calls).toHaveLength(KEPT + 1);
    widths.get('0', FONT, measure('0'));
    expect(calls).toHaveLength(KEPT + 2);
  });

  it('measures again once a web font finishes loading, and stops listening when destroyed', () => {
    const fonts = new EventTarget() as FontFaceSet;
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    const widths = new LabelWidths();
    const { measure, calls } = counting();
    widths.get('100.00', FONT, measure('100.00'));
    fonts.dispatchEvent(new Event('loadingdone'));
    widths.get('100.00', FONT, measure('100.00'));
    expect(calls).toHaveLength(2);
    widths.destroy();
    widths.get('100.00', FONT, measure('100.00'));
    expect(calls).toHaveLength(3);
    // Destroyed, it no longer hears the fonts: what it measured after stays kept.
    fonts.dispatchEvent(new Event('loadingdone'));
    widths.get('100.00', FONT, measure('100.00'));
    expect(calls).toHaveLength(3);
  });
});
