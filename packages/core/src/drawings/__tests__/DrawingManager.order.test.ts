import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { unitViewport } from './fixtures.js';

let manager: DrawingManager;
let a: string;
let b: string;
let c: string;

const ids = () => manager.getDrawings().map((d) => d.id);
const line = (price: number) =>
  manager.addDrawing({ type: 'trendLine', anchors: [{ time: 0, price }, { time: 5, price }] });

beforeEach(() => {
  manager = new DrawingManager();
  manager.register(new TrendLineTool());
  manager.setUndoRedoManager(new UndoRedoManager());
  a = line(10);
  b = line(20);
  c = line(30);
});

describe('DrawingManager drawing order', () => {
  it('brings a drawing to the front, sends it to the back, or one step', () => {
    manager.moveDrawing(a, 'front');
    expect(ids()).toEqual([b, c, a]);
    manager.moveDrawing(a, 'backward');
    expect(ids()).toEqual([b, a, c]);
    manager.moveDrawing(c, 'back');
    expect(ids()).toEqual([c, b, a]);
    manager.moveDrawing(c, 'forward');
    expect(ids()).toEqual([b, c, a]);
  });

  it('undoes a move', () => {
    manager.moveDrawing(a, 'front');
    manager.undo();
    expect(ids()).toEqual([a, b, c]);
    manager.redo();
    expect(ids()).toEqual([b, c, a]);
  });

  it('does nothing for the top drawing brought forward, or an unknown one', () => {
    expect(manager.moveDrawing(c, 'forward')).toBe(false);
    expect(manager.moveDrawing('nope', 'front')).toBe(false);
    expect(ids()).toEqual([a, b, c]);
  });

  it('puts a deleted drawing back in its place on undo', () => {
    manager.removeDrawing(b);
    manager.undo();
    expect(ids()).toEqual([a, b, c]);
  });

  it('moves the selected drawing with Ctrl+] and Ctrl+[ (Shift: all the way)', () => {
    manager.onPointerDown({ x: 30, y: 90 }, unitViewport); // select a (y 90 = price 10)
    manager.onPointerUp();
    manager.onKeyDown(']', true);
    expect(ids()).toEqual([b, a, c]);
    manager.onKeyDown('}', true);
    expect(ids()).toEqual([b, c, a]);
    manager.onKeyDown('{', true);
    expect(ids()).toEqual([a, b, c]);
  });
});

describe('DrawingManager groups', () => {
  it('groups drawings under a name and lists the group', () => {
    const group = manager.groupDrawings([a, c], 'Weekly levels')!;
    expect(manager.getGroups()).toEqual([{ id: group, name: 'Weekly levels', ids: [a, c] }]);
    expect(manager.getDrawings().find((d) => d.id === b)!.group).toBeUndefined();
  });

  it('needs two drawings to make a group', () => {
    expect(manager.groupDrawings([a])).toBeNull();
    expect(manager.groupDrawings([a, 'nope'])).toBeNull();
  });

  it('hides, locks and renames a group as one', () => {
    const group = manager.groupDrawings([a, c])!;
    manager.setGroupVisible(group, false);
    manager.setGroupLocked(group, true);
    manager.renameGroup(group, 'Old highs');
    const members = manager.getDrawings().filter((d) => d.group?.id === group);
    expect(members.every((d) => !d.visible && d.locked && d.group?.name === 'Old highs')).toBe(true);
  });

  it('selects the whole group when one of it is clicked', () => {
    manager.groupDrawings([a, c]);
    manager.onPointerDown({ x: 30, y: 90 }, unitViewport); // a
    manager.onPointerUp();
    expect(manager.getSelectedDrawingIds().sort()).toEqual([a, c].sort());
  });

  it('ungroups, and groups the selection with Ctrl+G', () => {
    const group = manager.groupDrawings([a, c])!;
    manager.ungroup(group);
    expect(manager.getGroups()).toEqual([]);
    manager.onPointerDown({ x: 30, y: 90 }, unitViewport); // a
    manager.onPointerUp();
    manager.toggleSelectionAt({ x: 30, y: 80 }, unitViewport); // + b
    expect(manager.onKeyDown('g', true)).toBe(true);
    expect(manager.getGroups()).toEqual([expect.objectContaining({ ids: [a, b] })]);
    expect(manager.onKeyDown('G', true)).toBe(true); // Ctrl+Shift+G ungroups
    expect(manager.getGroups()).toEqual([]);
  });

  it('takes grouping back with one undo', () => {
    manager.groupDrawings([a, c]);
    manager.undo();
    expect(manager.getGroups()).toEqual([]);
  });
});

describe('DrawingManager removing several drawings', () => {
  it('removes them as one undo step, keeps the locked ones, and clears the selection', () => {
    manager.setDrawingLocked(c, true);
    manager.select(a);
    expect(manager.removeDrawings([a, b, c, 'nope'])).toBe(2);
    expect(ids()).toEqual([c]);
    expect(manager.getSelectedDrawingIds()).toEqual([]);
    manager.undo();
    expect(ids()).toEqual([a, b, c]);
  });

  it('removes nothing when every drawing is locked', () => {
    manager.setDrawingLocked(a, true);
    expect(manager.removeDrawings([a])).toBe(0);
    expect(ids()).toEqual([a, b, c]);
  });
});

describe('DrawingManager selecting from a menu', () => {
  it('selects a drawing and its group, and keeps a selection it is part of', () => {
    const group = manager.groupDrawings([a, c])!;
    manager.select(b);
    expect(manager.getSelectedDrawingIds()).toEqual([b]);
    manager.select(a);
    expect(manager.getSelectedDrawingIds().sort()).toEqual([a, c].sort());
    manager.select(c); // already selected: the selection stays
    expect(manager.getSelectedDrawingIds().sort()).toEqual([a, c].sort());
    expect(manager.select('nope')).toBe(false);
    void group;
  });
});

