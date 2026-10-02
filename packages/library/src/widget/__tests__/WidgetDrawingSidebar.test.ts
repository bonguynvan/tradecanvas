// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetDrawingSidebar } from '../WidgetDrawingSidebar.js';
import { DRAWING_TOOL_GROUPS } from '../widgetConfig.js';
import type { WidgetState } from '../types.js';
import { createToolIcon } from '../icons.js';

let host: HTMLDivElement;
let sidebar: WidgetDrawingSidebar;
let picked: string[];

const wraps = () => [...host.querySelectorAll<HTMLElement>('.tcw-tool-group-wrap')];
const flyout = () => host.querySelector('.tcw-flyout');
const enter = (el: Element) => el.dispatchEvent(new MouseEvent('mouseenter'));
const leave = (el: Element) => el.dispatchEvent(new MouseEvent('mouseleave'));

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  picked = [];
  sidebar = new WidgetDrawingSidebar(host, { drawingToolGroups: DRAWING_TOOL_GROUPS }, {
    onDrawingTool: (tool) => { picked.push(tool); },
    onCancelDrawing: () => {},
    onUndo: () => {},
    onRedo: () => {},
    onClearDrawings: () => {},
  });
  sidebar.update({ activeTool: null, magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
});

afterEach(() => {
  sidebar.destroy();
  host.remove();
  vi.useRealTimers();
});

describe('drawing tool menu', () => {
  it('stays open while the pointer crosses from the button to the menu', () => {
    const lines = wraps()[0];
    enter(lines);
    const menu = flyout();
    expect(menu).not.toBeNull();
    leave(lines); // the pointer slips off for a moment…
    vi.advanceTimersByTime(80);
    enter(lines); // …and is back over the menu
    vi.advanceTimersByTime(500);
    expect(flyout()).toBe(menu); // the same menu, not closed and rebuilt
  });

  it('closes shortly after the pointer leaves for good', () => {
    const lines = wraps()[0];
    enter(lines);
    leave(lines);
    vi.advanceTimersByTime(200);
    expect(flyout()).toBeNull();
  });

  it('switches straight to another group', () => {
    const [lines, levels] = wraps();
    enter(lines);
    leave(lines);
    enter(levels);
    expect(host.querySelectorAll('.tcw-flyout')).toHaveLength(1);
    expect(levels.querySelector('.tcw-flyout')).not.toBeNull();
  });
});

describe('drawing tool icons', () => {
  /** As the DOM serialises it. */
  const html = (markup: string) => { const d = document.createElement('div'); d.innerHTML = markup; return d.innerHTML; };
  const groupButton = () => wraps()[0].querySelector<HTMLButtonElement>('.tcw-sidebar-btn')!;

  it('shows each tool its own icon in the menu', () => {
    enter(wraps()[0]);
    const items = [...host.querySelectorAll<HTMLElement>('.tcw-flyout-item')];
    expect(items[1].dataset.toolValue).toBe('ray');
    expect(items[1].querySelector('svg')!.outerHTML).toBe(html(createToolIcon('ray', 16)));
    expect(items[1].textContent).toBe('Ray');
  });

  it('lets a group button stand for, and pick, the tool last used in it', () => {
    expect(groupButton().innerHTML).toContain(html(createToolIcon('trendLine', 16)));
    sidebar.update({ activeTool: 'ray', magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
    expect(groupButton().innerHTML).toContain(html(createToolIcon('ray', 16)));
    expect(groupButton().querySelector('.tcw-multi-dot')).not.toBeNull();
    sidebar.update({ activeTool: null, magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
    groupButton().click();
    expect(picked).toEqual(['ray']);
  });
});
