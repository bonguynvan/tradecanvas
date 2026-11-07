// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { toolFitSize, watchToolFit } from '../toolFit.js';

describe('toolFitSize', () => {
  it('leaves the tools at their size when they fit', () => {
    expect(toolFitSize({ button: 33, count: 22, overflow: 0, min: 26 })).toBeNull();
    expect(toolFitSize({ button: 33, count: 22, overflow: -40, min: 26 })).toBeNull();
  });

  it('takes from each button what the column lacks, rounded so they all fit', () => {
    // 22 tools 45 px too tall for a 1280 × 800 laptop's column: 3 px off each.
    expect(toolFitSize({ button: 33, count: 22, overflow: 45, min: 26 })).toBe(30);
    expect(toolFitSize({ button: 33, count: 22, overflow: 22, min: 26 })).toBe(32);
  });

  it('never goes under the other buttons’ size: the column scrolls from there, as before', () => {
    expect(toolFitSize({ button: 33, count: 22, overflow: 400, min: 26 })).toBe(26);
  });

  it('does nothing without tools or with tools already at the floor', () => {
    expect(toolFitSize({ button: 33, count: 0, overflow: 45, min: 26 })).toBeNull();
    expect(toolFitSize({ button: 26, count: 22, overflow: 45, min: 26 })).toBeNull();
  });
});

describe('watchToolFit', () => {
  /** A column `height` px high whose 22 tools want `content` px, in a root; frames run when `flush` is called. */
  function setup(height: number, content: number) {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const root = document.createElement('div');
    root.className = 'tcw-root';
    root.style.setProperty('--tcw-control-h', '26px');
    const column = document.createElement('div');
    root.appendChild(column);
    document.body.appendChild(root);
    const box = { height, content };
    // jsdom lays nothing out: the column measures as told, its buttons at the fit or 33.
    Object.defineProperty(column, 'clientHeight', { get: () => box.height });
    Object.defineProperty(column, 'scrollHeight', {
      get: () => {
        const fitted = parseFloat(column.style.getPropertyValue('--tcw-tool-fit'));
        return box.content - (Number.isNaN(fitted) ? 0 : 22 * (33 - fitted));
      },
    });
    for (let i = 0; i < 22; i++) {
      const b = document.createElement('button');
      b.className = 'tcw-sidebar-btn';
      Object.defineProperty(b, 'offsetHeight', { get: () => parseFloat(column.style.getPropertyValue('--tcw-tool-fit')) || 33 });
      column.appendChild(b);
    }
    const flush = async () => {
      await Promise.resolve(); // mutation records
      while (frames.length) frames.shift()!(0);
    };
    const fit = () => column.style.getPropertyValue('--tcw-tool-fit');
    return { root, column, box, flush, fit };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('caps a short column’s tools so they fit, and leaves a tall one’s alone', async () => {
    const short = setup(700, 745);
    const stop = watchToolFit(short.column);
    await short.flush();
    expect(short.fit()).toBe('30px');
    stop();
    const tall = setup(900, 745);
    watchToolFit(tall.column);
    await tall.flush();
    expect(tall.fit()).toBe('');
  });

  it('fits again when the root changes what shows the tools, though the column keeps its size', async () => {
    const { root, box, column, flush, fit } = setup(700, 745);
    watchToolFit(column);
    await flush();
    expect(fit()).toBe('30px');
    // A switch hides a section: the same column now holds them all at their size.
    box.content = 640;
    root.setAttribute('data-tcw-off', 'sidebar.lines');
    await flush();
    expect(fit()).toBe('');
  });

  it('sets nothing when the column cannot be measured, and stops when told', async () => {
    const { column, box, flush, fit } = setup(0, 745);
    const stop = watchToolFit(column);
    await flush();
    expect(fit()).toBe('');
    stop();
    box.height = 700;
    column.appendChild(document.createElement('div'));
    await flush();
    expect(fit()).toBe('');
  });
});
