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
    onRenameDrawing: vi.fn(),
    onCloneDrawing: vi.fn(),
    onSelectDrawing: vi.fn(),
    onMoveDrawing: vi.fn(),
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

describe('WidgetObjectTree drawings kept to other intervals', () => {
  it('steps back a drawing this interval does not show, and says why, its eye still on', () => {
    tree.setObjects([], [{ id: 'd', label: 'Trend Line', visible: true, offInterval: true, locked: false }]);
    const [row] = rows();
    expect(row.classList.contains('tcw-tree-hidden')).toBe(true);
    expect(row.title).toBe('Not shown on this interval');
    expect(button(row, 'Hide')).not.toBeNull();
  });
});

describe('WidgetObjectTree compares', () => {
  const compareRows = () => [...host.querySelectorAll<HTMLElement>('.tcw-tree-section:last-child .tcw-tree-row')];

  it('says how each symbol is compared, with its colour where it has one', () => {
    tree.setObjects([], [], [
      { id: 'cmp_BBB', label: 'BBB', color: '#f00', way: 'Percent change, on this scale' },
      { id: 'c1', label: 'CCC', way: 'Price, on its own scale' },
    ]);
    const [percent, scale] = compareRows();
    expect(percent.querySelector('.tcw-tree-name')!.textContent).toBe('BBB');
    expect(percent.querySelector('.tcw-tree-way')!.textContent).toBe('Percent change, on this scale');
    expect(percent.querySelector<HTMLElement>('.tcw-tree-dot')!.style.background).not.toBe('');
    expect(scale.querySelector('.tcw-tree-way')!.textContent).toBe('Price, on its own scale');
    // Its dot's room, empty, so the two symbols line up.
    expect(scale.querySelector<HTMLElement>('.tcw-tree-dot')!.style.background).toBe('');
    button(scale, 'Remove comparison').click();
    expect(callbacks.onRemoveCompare).toHaveBeenCalledWith('c1');
  });

  it('has no dots when no compare has a colour of its own', () => {
    tree.setObjects([], [], [{ id: 'c1', label: 'CCC', way: 'Price, on its own scale' }]);
    expect(compareRows()[0].querySelector('.tcw-tree-dot')).toBeNull();
  });
});

describe('WidgetObjectTree drawing rows', () => {
  const drawingRow = (id: string) => host.querySelector<HTMLElement>(`.tcw-tree-row[data-drawing-id="${id}"]`)!;
  const nameOf = (id: string) => drawingRow(id).querySelector<HTMLElement>('.tcw-tree-name')!;
  /** jsdom lays nothing out: each row 24 px tall, in the order shown. */
  const layOut = () => rows().forEach((r, i) => {
    r.getBoundingClientRect = () => ({ top: i * 24, bottom: i * 24 + 24, left: 0, right: 200, width: 200, height: 24, x: 0, y: i * 24, toJSON: () => ({}) });
  });

  it('selects the drawing a click on its name picks', () => {
    nameOf('b').click();
    expect(callbacks.onSelectDrawing).toHaveBeenCalledWith('b');
  });

  it('clones a drawing from its row', () => {
    button(drawingRow('b'), 'Clone').click();
    expect(callbacks.onCloneDrawing).toHaveBeenCalledWith('b');
  });

  it('renames a drawing from a double-click on its name; Escape keeps it, an empty name clears it', () => {
    const rename = (value: string, key: string) => {
      nameOf('b').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      const input = drawingRow('b').querySelector<HTMLInputElement>('input')!;
      input.value = value;
      input.dispatchEvent(new KeyboardEvent('keydown', { key }));
    };
    rename('Breakout ray', 'Enter');
    expect(callbacks.onRenameDrawing).toHaveBeenLastCalledWith('b', 'Breakout ray');
    rename('nope', 'Escape');
    expect(callbacks.onRenameDrawing).toHaveBeenCalledTimes(1);
    rename('  ', 'Enter');
    expect(callbacks.onRenameDrawing).toHaveBeenLastCalledWith('b', '');
  });

  it('moves a drawing to where its row is dropped, by its grip', () => {
    tree.setObjects([], DRAWINGS.map(({ group: _group, ...d }) => d));
    layOut();
    const grip = button(drawingRow('b'), 'Drag to reorder');
    grip.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 24 + 10, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: 6 }));
    expect(drawingRow('a').classList.contains('tcw-tree-drop')).toBe(true);
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: 6 }));
    // Dropped on the trend line's row: its place, 0, in the chart's order.
    expect(callbacks.onMoveDrawing).toHaveBeenCalledWith('b', 0);
    expect(host.querySelector('.tcw-tree-drop')).toBeNull();
  });

  it('moves nothing when the grip is let go on its own row', () => {
    tree.setObjects([], DRAWINGS.map(({ group: _group, ...d }) => d));
    layOut();
    const grip = button(drawingRow('b'), 'Drag to reorder');
    grip.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 24 + 10, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: 24 + 12 }));
    expect(callbacks.onMoveDrawing).not.toHaveBeenCalled();
  });
});

describe('WidgetObjectTree reorder around groups', () => {
  // Chart order a(g), b, c(g), d: the tree shows G, a, c, b, d.
  const MIXED: ObjectTreeDrawing[] = [
    { id: 'a', label: 'A', visible: true, locked: false, group },
    { id: 'b', label: 'B', visible: true, locked: false },
    { id: 'c', label: 'C', visible: true, locked: false, group },
    { id: 'd', label: 'D', visible: true, locked: false },
  ];
  const drawingRow = (id: string) => host.querySelector<HTMLElement>(`.tcw-tree-row[data-drawing-id="${id}"]`)!;
  const grip = (id: string) => drawingRow(id).querySelector<HTMLButtonElement>('[aria-label="Drag to reorder"]');
  const layOut = () => rows().forEach((r, i) => {
    r.getBoundingClientRect = () => ({ top: i * 24, bottom: i * 24 + 24, left: 0, right: 200, width: 200, height: 24, x: 0, y: i * 24, toJSON: () => ({}) });
  });

  beforeEach(() => tree.setObjects([], MIXED));

  it('gives a grip only to drawings outside a group: a group moves as one', () => {
    expect(grip('a')).toBeNull();
    expect(grip('b')).not.toBeNull();
  });

  it('drops a drawing beside the row it lands on', () => {
    layOut();
    // d (shown last) onto b (shown fourth): d goes where b is, just under it in the list.
    grip('d')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 4 * 24 + 10, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: 3 * 24 + 6 }));
    expect(drawingRow('c').classList.contains('tcw-tree-drop')).toBe(false);
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: 3 * 24 + 6 }));
    expect(callbacks.onMoveDrawing).toHaveBeenCalledWith('d', 1);
  });

  it('takes no drop on a grouped drawing’s row', () => {
    layOut();
    grip('d')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 4 * 24 + 10, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: 2 * 24 + 6 }));
    expect(callbacks.onMoveDrawing).not.toHaveBeenCalled();
  });

  it('moves a drawing one row up or down among the others with the arrow keys', () => {
    grip('d')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(callbacks.onMoveDrawing).toHaveBeenLastCalledWith('d', 1);
    grip('b')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(callbacks.onMoveDrawing).toHaveBeenLastCalledWith('b', 3);
    // Nothing above b but the group: it stays.
    grip('b')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(callbacks.onMoveDrawing).toHaveBeenCalledTimes(2);
  });

  it('keeps the grip focused through the list being drawn again, so the keys go on moving it', () => {
    grip('d')!.focus();
    tree.setObjects([], MIXED);
    expect(document.activeElement).toBe(grip('d'));
  });

  it('waits for a rename to end before drawing the list again', () => {
    drawingRow('b').querySelector<HTMLElement>('.tcw-tree-name')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = drawingRow('b').querySelector<HTMLInputElement>('input')!;
    input.value = 'Kept';
    tree.setObjects([], [...MIXED, { id: 'e', label: 'E', visible: true, locked: false }]);
    expect(input.isConnected).toBe(true);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(callbacks.onRenameDrawing).toHaveBeenCalledWith('b', 'Kept');
    expect(drawingRow('e')).not.toBeNull();
  });
});
