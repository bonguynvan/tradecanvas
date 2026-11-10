// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  createPoweredBy,
  poweredByHtml,
  poweredByLayout,
  safeBadgeHref,
  POWERED_BY_LABEL,
  TRADECANVAS_MARK_SVG,
  TRADECANVAS_URL,
  TRADECANVAS_WORDMARK_SVG,
} from '../poweredBy.js';

describe('the Powered by badge', () => {
  it('is one link to the site, named for screen readers, opening in a new tab safely', () => {
    const a = createPoweredBy();
    expect(a.tagName).toBe('A');
    expect(a.getAttribute('href')).toBe(TRADECANVAS_URL);
    expect(a.getAttribute('aria-label')).toBe(POWERED_BY_LABEL);
    expect(a.target).toBe('_blank');
    expect(a.rel).toBe('noopener noreferrer');
    expect(a.textContent).toBe('Powered by');
  });

  it('hides its parts from screen readers, so the name is read once', () => {
    const a = createPoweredBy();
    const parts = Array.from(a.children);
    expect(parts).toHaveLength(3);
    for (const part of parts) expect(part.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes the colour around it: the ring, bar and wordmark are currentColor, only the candle is amber', () => {
    expect(TRADECANVAS_MARK_SVG).toContain('stroke="currentColor"');
    expect(TRADECANVAS_MARK_SVG.match(/fill="#[0-9A-Fa-f]{6}"/g)).toEqual(['fill="#E8961E"']);
    expect(TRADECANVAS_WORDMARK_SVG).toContain('fill="currentColor"');
    expect(TRADECANVAS_WORDMARK_SVG).not.toMatch(/#[0-9A-Fa-f]{6}/);
    expect(createPoweredBy().style.color).toBe('inherit');
  });

  it('is drawn from outlines, with no live text in its SVG', () => {
    expect(TRADECANVAS_MARK_SVG).not.toContain('<text');
    expect(TRADECANVAS_WORDMARK_SVG).not.toContain('<text');
  });

  it('sizes everything from the mark’s height, its words never under 10 px', () => {
    expect(poweredByLayout(16)).toMatchObject({ height: 16, fontSize: 10 });
    expect(poweredByLayout(14).fontSize).toBe(10);
    expect(poweredByLayout(24).fontSize).toBeCloseTo(13.9, 1);
    const at24 = createPoweredBy({ height: 24 });
    const [, mark, word] = Array.from(at24.children);
    expect(mark.getAttribute('height')).toBe('24');
    expect(Number(word.getAttribute('height'))).toBeLessThan(24);
  });

  it('keeps a height too small or not a number to one that still reads', () => {
    expect(poweredByLayout(4).height).toBe(12);
    expect(poweredByLayout(Number.NaN).height).toBe(16);
  });

  it('links where it is told, but never to a script URL', () => {
    expect(createPoweredBy({ href: 'https://tradecanvas.dev/docs' }).getAttribute('href')).toBe('https://tradecanvas.dev/docs');
    expect(safeBadgeHref('javascript:alert(1)')).toBe(TRADECANVAS_URL);
    expect(safeBadgeHref('/about')).toBe('/about');
  });

  it('opens in the same tab when asked, without the new-tab rel', () => {
    const a = createPoweredBy({ target: '_self' });
    expect(a.target).toBe('_self');
    expect(a.getAttribute('rel')).toBeNull();
  });

  it('keeps a page opened in a named tab from reaching back', () => {
    expect(createPoweredBy({ target: 'docs' }).rel).toBe('noopener noreferrer');
    expect(createPoweredBy({ target: '_TOP' }).getAttribute('rel')).toBeNull();
  });

  it('escapes what it is given', () => {
    expect(poweredByHtml({ href: 'https://x.dev/?a="b"' })).toContain('href="https://x.dev/?a=&quot;b&quot;"');
  });
});
