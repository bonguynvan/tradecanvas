import { describe, it, expect } from 'vitest';
import { drawingMenuEntries } from '../drawingMenu.js';

const t = (key: string) => key;
const ids = (entries: ReturnType<typeof drawingMenuEntries>) => entries.flatMap((e) => (e === 'separator' ? [] : [e.id]));
const one = [{ id: 'd1', locked: false, groupId: null }];

describe('a drawing\u2019s menu', () => {
  it('offers its words to one drawing that writes some, after its settings', () => {
    const entries = ids(drawingMenuEntries({ selected: one, canConfigure: true, canAlert: false, canText: true }, t));
    expect(entries.slice(0, 2)).toEqual(['settings', 'text']);
  });

  it('offers none to a tool that writes none, or to several drawings', () => {
    expect(ids(drawingMenuEntries({ selected: one, canConfigure: true, canAlert: false }, t))).not.toContain('text');
    const two = [...one, { id: 'd2', locked: false, groupId: null }];
    expect(ids(drawingMenuEntries({ selected: two, canConfigure: true, canAlert: false, canText: true }, t))).not.toContain('text');
  });
});
