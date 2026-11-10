import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import PoweredBy from '../src/PoweredBy.svelte';

afterEach(() => cleanup());

describe('<PoweredBy>', () => {
  it('is one link to the site, named once for screen readers', () => {
    const { container } = render(PoweredBy);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://tradecanvas.dev');
    expect(a.getAttribute('aria-label')).toBe('Powered by TradeCanvas');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    for (const part of Array.from(a.children)) expect(part.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws the mark and the wordmark at its size', () => {
    const { container } = render(PoweredBy, { props: { size: 14 } });
    const [mark, word] = Array.from(container.querySelectorAll('svg'));
    expect(mark.getAttribute('height')).toBe('14');
    expect(Number(word.getAttribute('height'))).toBeLessThan(14);
    expect(container.querySelector('a')!.style.fontSize).toBe('10px');
  });

  it('links where it is told, in the same tab when asked, but never to a script URL', () => {
    const { container } = render(PoweredBy, { props: { href: 'https://tradecanvas.dev/docs', target: '_self', class: 'foot' } });
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://tradecanvas.dev/docs');
    expect(a.getAttribute('rel')).toBeNull();
    expect(a.classList.contains('foot')).toBe(true);
    cleanup();
    const bad = render(PoweredBy, { props: { href: 'javascript:alert(1)' } }).container.querySelector('a')!;
    expect(bad.getAttribute('href')).toBe('https://tradecanvas.dev');
  });
});
