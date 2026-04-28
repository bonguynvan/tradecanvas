import { describe, it, expect } from 'vitest';
import { resolveAnnotationText } from '../tools/TextAnnotation.js';
import { drawing } from './fixtures.js';

describe('resolveAnnotationText', () => {
  it('returns style.text when present', () => {
    const state = drawing('text', [{ time: 0, price: 50 }], {
      style: {
        color: '#000',
        lineWidth: 1,
        lineStyle: 'solid',
        text: 'Hello',
      },
    });
    expect(resolveAnnotationText(state)).toBe('Hello');
  });

  it('falls through to meta.text when style.text is missing', () => {
    const state = drawing('text', [{ time: 0, price: 50 }], {
      meta: { text: 'From meta' },
    });
    expect(resolveAnnotationText(state)).toBe('From meta');
  });

  it('falls back to the default when both style.text and meta.text are absent', () => {
    const state = drawing('text', [{ time: 0, price: 50 }]);
    expect(resolveAnnotationText(state)).toBe('Text');
    expect(resolveAnnotationText(state, 'custom')).toBe('custom');
  });

  it('treats a non-string meta.text as missing instead of casting it', () => {
    const state = drawing('text', [{ time: 0, price: 50 }], {
      meta: { text: 42 as unknown as string },
    });
    expect(resolveAnnotationText(state)).toBe('Text');
  });

  it('treats an empty style.text as missing and falls through to meta', () => {
    const state = drawing('text', [{ time: 0, price: 50 }], {
      style: { color: '#000', lineWidth: 1, lineStyle: 'solid', text: '' },
      meta: { text: 'Backup' },
    });
    expect(resolveAnnotationText(state)).toBe('Backup');
  });
});
