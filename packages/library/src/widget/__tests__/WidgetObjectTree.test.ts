// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetObjectTree, type ObjectTreeCallbacks, type ObjectTreeDrawing } from '../WidgetObjectTree.js';

let host: HTMLDivElement;
let callbacks: ObjectTreeCallbacks & { [K in keyof ObjectTreeCallbacks]-?: ReturnType<typeof vi.fn> };
let tree: WidgetObjectTree;

const group = { id: 'g1', name: 'Weekly levels' };
const DRAWINGS: ObjectTreeDrawing[] = [
  { id: 'a', label: 'Trend Line', visible: true, locked: false, group },
  { id: 'b', label: 'Ray', visible: true, locked: false },
  { id: 'c', label: 'Horizontal Line', visible: false, locked: true, group },
];

const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-tree-row')];
const groupRow = () => host.querySelector<HTMLElement>('.tcw-tree-group')!;
const button = (row: HTMLElement, label: string) => row.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  callbacks = {
    onRemoveIndicator: vi.fn(),
    onConfigureIndicator: vi.fn(),
    onToggleIndicatorVisible: vi.fn(),
    onRemoveDrawing: vi.fn(),
    onToggleDrawingVisible: vi.fn(),
    onToggleDrawingLocked: vi.fn(),
    onConfigureDrawing: vi.fn(),
    onToggleGroupVisible: vi.fn(),
    onToggleGroupLocked: vi.fn(),
    onUngroup: vi.fn(),
    onRenameGroup: vi.fn(),
    onAddCompare: vi.fn(),
    onRemoveCompare: vi.fn(),
  };
  tree = new WidgetObjectTree(host, callbacks);
  tree.setObjects([], DRAWINGS);
});

afterEach(() => {
  tree.destroy();
  host.remove();
});

describe('WidgetObjectTree groups', () => {
  it('lists a group where its first drawing is, its drawings under it', () => {
    const names = rows().map((r) => r.querySelector('.tcw-tree-name')!.textContent!.trim());
    expect(names).toEqual(['Weekly levels', 'Trend Line', 'Horizontal Line', 'Ray']);
    expect(rows().map((r) => r.classList.contains('tcw-tree-member'))).toEqual([false, true, true, false]);
  });

  it('hides, locks and ungroups the group', () => {
    const row = groupRow();
    button(row, 'Hide').click(); // one drawing is still shown
    expect(callbacks.onToggleGroupVisible).toHaveBeenCalledWith('g1', false);
    button(row, 'Lock').click(); // not every drawing is locked
    expect(callbacks.onToggleGroupLocked).toHaveBeenCalledWith('g1', true);
    button(row, 'Ungroup').click();
    expect(callbacks.onUngroup).toHaveBeenCalledWith('g1');
  });

  it('renames the group from a text box: Enter saves, Escape keeps the name', () => {
    button(groupRow(), 'Rename group').click();
    let input = host.querySelector<HTMLInputElement>('.tcw-tree-rename')!;
    expect(input.value).toBe('Weekly levels');
    input.value = 'Old highs';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(callbacks.onRenameGroup).toHaveBeenCalledWith('g1', 'Old highs');

    callbacks.onRenameGroup.mockClear();
    tree.setObjects([], DRAWINGS);
    button(groupRow(), 'Rename group').click();
    input = host.querySelector<HTMLInputElement>('.tcw-tree-rename')!;
    input.value = 'Something else';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(callbacks.onRenameGroup).not.toHaveBeenCalled();
    expect(host.querySelector('.tcw-tree-rename')).toBeNull();
    expect(groupRow().querySelector('.tcw-tree-name')!.textContent!.trim()).toBe('Weekly levels');
  });
});
