import { describe, it, expect } from 'vitest';
import { overlaysForLayer } from '../contracts.js';
import type { OverlayPlugin } from '../contracts.js';

function ov(id: string, layer?: 'main' | 'overlay' | 'ui'): OverlayPlugin {
  return { descriptor: { id, name: id, layer }, render: () => {} };
}

describe('overlaysForLayer', () => {
  const all = [ov('a', 'main'), ov('b'), ov('c', 'overlay'), ov('d', 'ui')];

  it('defaults a missing layer to overlay', () => {
    expect(overlaysForLayer(all, 'overlay').map((o) => o.descriptor.id)).toEqual(['b', 'c']);
  });

  it('filters the main layer', () => {
    expect(overlaysForLayer(all, 'main').map((o) => o.descriptor.id)).toEqual(['a']);
  });

  it('filters the ui layer', () => {
    expect(overlaysForLayer(all, 'ui').map((o) => o.descriptor.id)).toEqual(['d']);
  });

  it('handles empty input', () => {
    expect(overlaysForLayer([], 'main')).toEqual([]);
  });
});
