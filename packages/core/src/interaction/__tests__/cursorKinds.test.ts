// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';
import { CrosshairHandler } from '../CrosshairHandler.js';
import { idleCssCursor } from '../cursorKinds.js';

describe('idleCssCursor', () => {
  it('is the crosshair for the cross and the default arrow for the arrow', () => {
    expect(idleCssCursor('cross', '#888888', '#000000')).toBe('crosshair');
    expect(idleCssCursor('arrow', '#888888', '#000000')).toBe('default');
  });

  it('draws the dot in the crosshair colour with a ring, its hotspot at its centre, and falls back to the crosshair', () => {
    const css = idleCssCursor('dot', 'rgba(150, 150, 150, 0.8)', '#101010');
    const match = /^url\("data:image\/svg\+xml,([^"]+)"\) (\d+) (\d+), crosshair$/.exec(css);
    expect(match).not.toBeNull();
    const svg = decodeURIComponent(match![1]);
    expect(svg).toContain("fill='rgba(150, 150, 150, 0.8)'");
    expect(svg).toContain("stroke='#101010'");
    const size = Number(/width='(\d+)'/.exec(svg)![1]);
    expect(Number(match![2])).toBe(Math.floor(size / 2));
    expect(Number(match![3])).toBe(Math.floor(size / 2));
  });

  it('keeps a colour from closing the image’s quotes', () => {
    const css = idleCssCursor('dot', `red' onload='x`, '#000');
    expect(decodeURIComponent(css)).not.toContain("onload='x");
  });
});

describe('InteractionManager — the cursor over the chart', () => {
  let el: HTMLDivElement;
  let im: InteractionManager;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) });
    im = new InteractionManager(el);
    im.setCrosshairHandler(new CrosshairHandler());
    im.attach();
  });

  afterEach(() => {
    im.detach();
    el.remove();
    vi.unstubAllGlobals();
  });

  const hover = () => el.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150, bubbles: true }));

  it('shows the crosshair cursor until told otherwise', () => {
    hover();
    expect(el.style.cursor).toBe('crosshair');
  });

  it('changes the cursor at once even when the browser wrote the last one back its own way', () => {
    im.setIdleCursor('url("data:image/svg+xml,a") 4 4, crosshair');
    hover();
    // A browser keeps a url() in its own form: the cursor read back is not the string given.
    el.style.cursor = 'url(data:image/svg+xml,a) 4 4, crosshair';
    im.setIdleCursor('default');
    expect(el.style.cursor).toBe('default');
  });

  it('leaves the element alone while the pointer has not been over the chart', () => {
    im.setIdleCursor('default');
    expect(el.style.cursor).toBe('');
  });

  it('shows the cursor set for the chart, at once and on the next move', () => {
    hover();
    im.setIdleCursor('default');
    expect(el.style.cursor).toBe('default');
    hover();
    expect(el.style.cursor).toBe('default');
  });
});
