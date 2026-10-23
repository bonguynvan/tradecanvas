// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetDrawingSidebar } from '../WidgetDrawingSidebar.js';
import { DRAWING_TOOL_GROUPS } from '../widgetConfig.js';
import { EN_TRANSLATOR } from '../i18n.js';
import { toolShortcuts } from '../drawingHotkeys.js';
import type { WidgetState } from '../types.js';

let host: HTMLDivElement;
let sidebar: WidgetDrawingSidebar;
let calls: string[];

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  calls = [];
  sidebar = new WidgetDrawingSidebar(host, { drawingToolGroups: DRAWING_TOOL_GROUPS, favorites: ['ray'], shortcuts: toolShortcuts() }, {
    onDrawingTool: (tool) => { calls.push(`pick ${tool}`); },
    onCancelDrawing: () => {},
    onClearDrawings: () => {},
    onToggleFavorite: (tool) => { calls.push(`pin ${tool}`); },
    onLockAll: (locked) => { calls.push(`lock ${locked}`); },
    onHideAll: (hidden) => { calls.push(`hide ${hidden}`); },
  }, EN_TRANSLATOR);
  sidebar.update({ activeTool: null, magnetEnabled: false, stayInDrawing: false } as unknown as WidgetState);
});

afterEach(() => {
  sidebar.destroy();
  host.remove();
  vi.useRealTimers();
});

const openLines = () => host.querySelector('.tcw-tool-group-wrap')!.dispatchEvent(new MouseEvent('mouseenter'));
const row = (tool: string) => host.querySelector<HTMLElement>(`.tcw-flyout-row[data-tool-value="${tool}"]`)!;

describe('a drawing tool menu', () => {
  it('names each tool’s shortcut', () => {
    openLines();
    expect(row('trendLine').querySelector('.tcw-flyout-key')?.textContent).toBe('Alt+T');
    expect(row('ray').querySelector('.tcw-flyout-key')).toBeNull();
  });

  it('has a star beside each tool to pin it, without picking it', () => {
    openLines();
    const star = row('trendLine').querySelector<HTMLButtonElement>('[data-pin]')!;
    expect(star.getAttribute('aria-pressed')).toBe('false');
    expect(row('ray').querySelector('[data-pin]')!.getAttribute('aria-pressed')).toBe('true');
    star.click();
    expect(calls).toEqual(['pin trendLine']);
  });

  it('no longer needs its right-click hint', () => {
    openLines();
    expect(host.querySelector('.tcw-flyout-hint')).toBeNull();
  });
});

describe('the drawing tools’ own switches', () => {
  const btn = (role: string) => host.querySelector<HTMLButtonElement>(`[data-role="${role}"]`)!;

  it('lock and hide every drawing at once, and show when they are', () => {
    btn('lockAll').click();
    btn('hideAll').click();
    expect(calls).toEqual(['lock true', 'hide true']);
    sidebar.setDrawingsState({ locked: true, hidden: false });
    expect(btn('lockAll').getAttribute('aria-pressed')).toBe('true');
    expect(btn('lockAll').title).toBe('Unlock all drawings');
    btn('lockAll').click();
    expect(calls.at(-1)).toBe('lock false');
  });

  it('leave undo and redo to the toolbar', () => {
    expect(host.querySelector('[data-tcw-part~="sidebar.undo"]')).toBeNull();
  });
});
