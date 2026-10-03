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

  it('stays open on the menu itself, which sits beside the sidebar (so the sidebar can scroll)', () => {
    const lines = wraps()[0];
    enter(lines);
    leave(lines);
    const menu = flyout()!;
    enter(menu);
    vi.advanceTimersByTime(500);
    expect(flyout()).toBe(menu);
    expect(lines.contains(menu)).toBe(false);
    leave(menu);
    vi.advanceTimersByTime(200);
    expect(flyout()).toBeNull();
  });

  it('switches straight to another group', () => {
    const [lines, levels] = wraps();
    enter(lines);
    leave(lines);
    enter(levels);
    expect(host.querySelectorAll('.tcw-flyout')).toHaveLength(1);
    expect(flyout()?.querySelector('.tcw-flyout-header')?.textContent).toBe('Horizontal/Vertical');
  });
});

describe('drawing tool menu from the keyboard', () => {
  const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const groupButton = (i: number) => wraps()[i].querySelector<HTMLButtonElement>('button')!;

  it('opens with an arrow key, moves with the arrows, and goes back with Escape', () => {
    const btn = groupButton(0);
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    btn.focus();
    key(btn, 'ArrowRight');
    const menu = flyout()!;
    expect(menu.getAttribute('role')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const items = [...menu.querySelectorAll<HTMLElement>('[role=menuitem]')];
    expect(document.activeElement).toBe(items[0]);
    key(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    key(items[1], 'ArrowUp');
    key(items[0], 'ArrowUp'); // wraps to the last
    expect(document.activeElement).toBe(items.at(-1));
    key(items.at(-1)!, 'Escape');
    expect(flyout()).toBeNull();
    expect(document.activeElement).toBe(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('picks a tool with Enter on its item', () => {
    const btn = groupButton(0);
    btn.focus();
    key(btn, 'ArrowDown');
    const second = flyout()!.querySelectorAll<HTMLButtonElement>('[role=menuitem]')[1];
    second.click(); // Enter on a button clicks it
    expect(picked).toEqual([DRAWING_TOOL_GROUPS[0].tools[1].value]);
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
    expect(groupButton().getAttribute('aria-label')).toBe('Lines: Trend Line');
    expect(groupButton().hasAttribute('title')).toBe(false); // its menu names it; no tooltip on top
    sidebar.update({ activeTool: 'ray', magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
    expect(groupButton().innerHTML).toContain(html(createToolIcon('ray', 16)));
    expect(groupButton().getAttribute('aria-label')).toBe('Lines: Ray');
    expect(groupButton().querySelector('.tcw-multi-dot')).not.toBeNull();
    sidebar.update({ activeTool: null, magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
    groupButton().click();
    expect(picked).toEqual(['ray']);
  });
});

describe('tool menu hint', () => {
  it('says once how to pin, instead of a tooltip on every row', () => {
    sidebar.destroy();
    sidebar = new WidgetDrawingSidebar(host, { drawingToolGroups: DRAWING_TOOL_GROUPS }, {
      onDrawingTool: () => {}, onCancelDrawing: () => {}, onUndo: () => {}, onRedo: () => {}, onClearDrawings: () => {},
      onToggleFavorite: () => {},
    });
    enter(wraps()[0]);
    expect(host.querySelector('.tcw-flyout-hint')?.textContent).toMatch(/pin/i);
    expect(host.querySelector('.tcw-flyout-item[title]')).toBeNull();
  });
});

describe('sections', () => {
  it('puts a divider between one section of tools and the next, none inside one', () => {
    const bar = host.querySelector('.tcw-sidebar')!;
    const kids = [...bar.children];
    const firstGroup = kids.findIndex((el) => el.classList.contains('tcw-tool-group-wrap'));
    const lastGroup = kids.findLastIndex((el) => el.classList.contains('tcw-tool-group-wrap'));
    const between = kids.slice(firstGroup, lastGroup + 1).filter((el) => el.classList.contains('tcw-sidebar-divider'));
    const sections = new Set(DRAWING_TOOL_GROUPS.map((g) => g.section));
    expect(between).toHaveLength(sections.size - 1);
    // The groups of one section are next to each other.
    const order = DRAWING_TOOL_GROUPS.map((g) => g.section);
    expect(order.filter((s, i) => s !== order[i - 1])).toEqual([...sections]);
  });

  it('draws no section dividers for groups without sections', () => {
    sidebar.destroy();
    sidebar = new WidgetDrawingSidebar(host, { drawingToolGroups: DRAWING_TOOL_GROUPS.map(({ section: _, ...g }) => g) }, {
      onDrawingTool: () => {}, onCancelDrawing: () => {}, onUndo: () => {}, onRedo: () => {}, onClearDrawings: () => {},
    });
    const kids = [...host.querySelector('.tcw-sidebar')!.children];
    const firstGroup = kids.findIndex((el) => el.classList.contains('tcw-tool-group-wrap'));
    const lastGroup = kids.findLastIndex((el) => el.classList.contains('tcw-tool-group-wrap'));
    expect(kids.slice(firstGroup, lastGroup + 1).some((el) => el.classList.contains('tcw-sidebar-divider'))).toBe(false);
  });
});

describe('dividers', () => {
  it('never puts two dividers in a row, even without the optional tools', () => {
    const kids = [...host.querySelector('.tcw-sidebar')!.children];
    kids.forEach((el, i) => {
      if (i === 0) return;
      const both = el.classList.contains('tcw-sidebar-divider') && kids[i - 1].classList.contains('tcw-sidebar-divider');
      expect(both, `children ${i - 1} and ${i}`).toBe(false);
    });
  });
});
