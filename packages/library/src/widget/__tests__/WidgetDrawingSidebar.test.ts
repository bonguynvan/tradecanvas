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
    onClear: () => {},
  });
  sidebar.update({ activeTool: null, magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
});

afterEach(() => {
  sidebar.destroy();
  host.remove();
  vi.useRealTimers();
});

describe('drawing tool menu', () => {
  // The column is wider than its buttons: from the button's edge the menu lay over the column's own right.
  it('opens beside the column, not beside its button', () => {
    const rect = (left: number, width: number) => ({ left, right: left + width, top: 40, bottom: 73, width, height: 33, x: left, y: 40, toJSON: () => ({}) }) as DOMRect;
    host.getBoundingClientRect = () => rect(0, 800);
    host.querySelector<HTMLElement>('.tcw-sidebar')!.getBoundingClientRect = () => rect(0, 53);
    wraps()[0].querySelector<HTMLElement>('.tcw-sidebar-btn')!.getBoundingClientRect = () => rect(10, 33);
    enter(wraps()[0]);
    expect((flyout() as HTMLElement).style.left).toBe('53px');
  });

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

  it('switches to another group a moment after the pointer reaches it, never with no menu between', () => {
    const [lines, fibonacci] = wraps();
    enter(lines);
    leave(lines);
    enter(fibonacci);
    expect(host.querySelectorAll('.tcw-flyout')).toHaveLength(1);
    vi.advanceTimersByTime(130);
    expect(host.querySelectorAll('.tcw-flyout')).toHaveLength(1);
    expect(flyout()?.getAttribute('aria-label')).toBe('Fibonacci');
  });

  // The pointer left a button for the gap between two, or the chart, then came on to another:
  // the first menu's time to close ran out before the second's turn came, and took that turn with it.
  it('opens the menu of a button reached a moment after another was left, however the two delays fall', () => {
    const [lines, fibonacci] = wraps();
    for (const gap of [20, 60, 100, 140]) {
      enter(lines);
      leave(lines);
      vi.advanceTimersByTime(gap); // over a divider, or out on the chart
      enter(fibonacci);
      vi.advanceTimersByTime(500);
      expect(flyout()?.getAttribute('aria-label'), `after ${gap} ms`).toBe('Fibonacci');
      expect(host.querySelectorAll('.tcw-flyout')).toHaveLength(1);
      leave(fibonacci);
      vi.advanceTimersByTime(500);
      expect(flyout()).toBeNull();
    }
  });

  it('opens no menu for a button the pointer left again before its turn came', () => {
    const [lines, fibonacci] = wraps();
    enter(lines);
    leave(lines);
    vi.advanceTimersByTime(100);
    enter(fibonacci);
    leave(fibonacci);
    vi.advanceTimersByTime(500);
    expect(flyout()).toBeNull();
  });

  it('keeps the open menu when the pointer crosses another button on its way into it', () => {
    const [lines, fibonacci] = wraps();
    enter(lines);
    const menu = flyout()!;
    leave(lines);
    enter(fibonacci); // a diagonal move down to the menu's lower items…
    leave(fibonacci);
    enter(menu); // …reaches the menu
    vi.advanceTimersByTime(500);
    expect(flyout()).toBe(menu);
  });

  it('gives the focus back to the button after a tool picked from a menu opened by the keys', () => {
    const button = wraps()[0].querySelector<HTMLButtonElement>('.tcw-sidebar-btn')!;
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    (document.activeElement as HTMLElement).click();
    expect(document.activeElement).toBe(button);
  });
});

describe('drawing tool buttons, a kind each', () => {
  const headings = () => [...(flyout()?.querySelectorAll('.tcw-flyout-heading') ?? [])].map((h) => h.textContent);

  // Few buttons, so the column needs no shrinking to hold them: big icons in a narrow column.
  it('gathers the tools in six buttons, each for a kind', () => {
    expect(wraps()).toHaveLength(6);
    expect(DRAWING_TOOL_GROUPS.map((g) => g.label)).toEqual(['Lines', 'Fibonacci', 'Patterns', 'Forecasting', 'Shapes', 'Annotation']);
  });

  it('lists a button’s tools under the kinds it gathers, with no name over them all', () => {
    enter(wraps()[0]);
    expect(headings()).toEqual(['Lines', 'Horizontal/Vertical', 'Channels']);
    expect(flyout()?.querySelector('.tcw-flyout-header')).toBeNull();
    // Each heading sits right before the first of its tools, and is not a menu item.
    const heading = flyout()!.querySelectorAll('.tcw-flyout-heading')[1];
    expect((heading.nextElementSibling as HTMLElement).dataset.toolValue).toBe('horizontalLine');
    expect(heading.getAttribute('role')).toBe('presentation');
  });

  it('keeps the group’s name over a menu whose first tools have no heading', () => {
    sidebar.destroy();
    sidebar = new WidgetDrawingSidebar(host, {
      drawingToolGroups: [{ label: 'Mine', tools: [{ label: 'Ray', value: 'ray' }, { label: 'Trend', value: 'trendLine' }, { label: 'Box', value: 'rectangle', heading: 'Boxes' }] }],
    }, { onDrawingTool: () => {}, onCancelDrawing: () => {}, onClear: () => {} });
    sidebar.update({ activeTool: null, magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
    enter(wraps()[0]);
    expect(flyout()?.querySelector('.tcw-flyout-header')?.textContent).toBe('Mine');
    expect(headings()).toEqual(['Boxes']);
  });

  it('keeps the name over a menu of one kind', () => {
    enter(wraps()[5]);
    expect(headings()).toEqual([]);
    expect(flyout()?.querySelector('.tcw-flyout-header')?.textContent).toBe('Annotation');
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

describe('pinning from a tool menu', () => {
  it('has a star on each row to pin with, and no tooltip on the rows themselves', () => {
    sidebar.destroy();
    sidebar = new WidgetDrawingSidebar(host, { drawingToolGroups: DRAWING_TOOL_GROUPS }, {
      onDrawingTool: () => {}, onCancelDrawing: () => {}, onClear: () => {},
      onToggleFavorite: () => {},
    });
    enter(wraps()[0]);
    const rows = host.querySelectorAll('.tcw-flyout-row');
    expect(host.querySelectorAll('.tcw-flyout-row [data-pin]').length).toBe(rows.length);
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
      onDrawingTool: () => {}, onCancelDrawing: () => {}, onClear: () => {},
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

describe('drawing sidebar — narrow (a phone)', () => {
  const fab = () => host.querySelector<HTMLButtonElement>('.tcw-sidebar-fab')!;
  const bar = () => host.querySelector<HTMLElement>('.tcw-sidebar')!;
  const narrow = () => host.setAttribute('data-tcw-narrow', '');

  it('opens and closes from the drawing button over the chart', () => {
    narrow();
    expect(fab()).not.toBeNull();
    fab().click();
    expect(bar().classList.contains('tcw-sidebar-open')).toBe(true);
    expect(fab().getAttribute('aria-expanded')).toBe('true');
    fab().click();
    expect(bar().classList.contains('tcw-sidebar-open')).toBe(false);
  });

  it('a tap on a group of tools opens its menu; a pick there closes the sidebar for the chart', () => {
    narrow();
    fab().click();
    const lines = wraps()[0].querySelector('button')!;
    lines.click();
    expect(picked).toEqual([]);
    expect(flyout()).not.toBeNull();
    flyout()!.querySelectorAll<HTMLButtonElement>('.tcw-flyout-item')[1].click();
    expect(picked).toHaveLength(1);
    expect(bar().classList.contains('tcw-sidebar-open')).toBe(false);
  });

  it('closes on a press outside it', () => {
    narrow();
    fab().click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(bar().classList.contains('tcw-sidebar-open')).toBe(false);
  });

  it('the drawing button shows the tool picked, lit', () => {
    narrow();
    sidebar.update({ activeTool: 'trendLine', magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
    expect(fab().classList.contains('tcw-active')).toBe(true);
    const same = document.createElement('div');
    same.innerHTML = createToolIcon('trendLine', 18);
    expect(fab().innerHTML).toBe(same.innerHTML);
  });

  it('wide, a tap on a group still picks its tool', () => {
    wraps()[0].querySelector('button')!.click();
    expect(picked).toHaveLength(1);
  });
});

describe('cursor menu', () => {
  let kinds: string[];
  let cancelled: number;

  beforeEach(() => {
    sidebar.destroy();
    kinds = [];
    cancelled = 0;
    sidebar = new WidgetDrawingSidebar(host, { drawingToolGroups: DRAWING_TOOL_GROUPS }, {
      onDrawingTool: (tool) => { picked.push(tool); },
      onCancelDrawing: () => { cancelled++; },
      onClear: () => {},
      onCrosshairCursor: (kind) => { kinds.push(kind); },
    });
    sidebar.update({ activeTool: null, magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
  });

  const cursorWrap = () => host.querySelector<HTMLElement>('.tcw-cursor-wrap')!;
  const cursorButton = () => cursorWrap().querySelector<HTMLButtonElement>('.tcw-sidebar-btn')!;
  const items = () => [...(flyout()?.querySelectorAll<HTMLElement>('.tcw-flyout-item') ?? [])];

  it('lists the cross, the dot and the arrow under a heading, the one in use ticked', () => {
    sidebar.showCrosshairCursor('dot');
    enter(cursorWrap());
    expect(flyout()?.querySelector('.tcw-flyout-heading')?.textContent).toBe('Cursors');
    expect(items().map((i) => i.dataset.cursor)).toEqual(['cross', 'dot', 'arrow']);
    expect(items().map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(items().every((i) => i.getAttribute('role') === 'menuitemradio')).toBe(true);
  });

  it('picks a kind from the menu, and leaves the drawing tools for the cursor', () => {
    enter(cursorWrap());
    items()[2].click();
    expect(kinds).toEqual(['arrow']);
    expect(cancelled).toBe(1);
    expect(flyout()).toBeNull();
  });

  it('shows the kind in use on its button', () => {
    sidebar.showCrosshairCursor('arrow');
    const arrow = cursorButton().innerHTML;
    sidebar.showCrosshairCursor('dot');
    expect(cursorButton().innerHTML).not.toBe(arrow);
    expect(cursorButton().getAttribute('aria-label')).toBe('Cursor: Dot');
  });

  it('a click on the button keeps its old work: back to the cursor', () => {
    cursorButton().click();
    expect(cancelled).toBe(1);
    expect(kinds).toEqual([]);
  });

  it('a host that cannot change the kind gets the plain button, with no menu', () => {
    sidebar.destroy();
    sidebar = new WidgetDrawingSidebar(host, { drawingToolGroups: DRAWING_TOOL_GROUPS }, {
      onDrawingTool: () => {}, onCancelDrawing: () => {}, onClear: () => {},
    });
    enter(cursorWrap());
    expect(flyout()).toBeNull();
    expect(cursorButton().hasAttribute('aria-haspopup')).toBe(false);
  });

  it('narrow, a tap opens the menu and a second closes it; a kind picked goes back to the cursor', () => {
    host.setAttribute('data-tcw-narrow', '');
    cursorButton().click();
    expect(items()).toHaveLength(3);
    expect(cancelled).toBe(0);
    cursorButton().click();
    expect(flyout()).toBeNull();
    cursorButton().click();
    items()[1].click();
    expect(kinds).toEqual(['dot']);
    expect(cancelled).toBe(1);
  });

  it('closes a menu the pointer opened with Escape on its button', () => {
    enter(cursorWrap());
    cursorButton().focus();
    cursorButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(flyout()).toBeNull();
    expect(cursorButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('gives the focus back to its button after a kind picked with the keys', () => {
    cursorButton().focus();
    cursorButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    items()[1].click();
    expect(kinds).toEqual(['dot']);
    expect(document.activeElement).toBe(cursorButton());
  });

  it('opens from the keyboard and goes back to its button with Escape', () => {
    cursorButton().focus();
    cursorButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(items()[0]);
    items()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(flyout()).toBeNull();
    expect(document.activeElement).toBe(cursorButton());
  });
});
