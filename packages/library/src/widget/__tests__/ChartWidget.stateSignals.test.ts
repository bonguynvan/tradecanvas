// @vitest-environment jsdom
import { describe, beforeAll, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { preloadDialogs } from '../widgetDialogs.js';
import { ChartWidget } from '../ChartWidget.js';

let host: HTMLDivElement;
let widget: ChartWidget;

// The dialogs load their code when first opened; here it is in up front, so each opens at once.
beforeAll(preloadDialogs);

beforeEach(() => {
  localStorage.clear();
  installChartStubs();
  host = sizedHost();
  widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], trading: true });
});

afterEach(() => {
  widget.destroy();
  document.querySelectorAll('.tcw-portal').forEach((p) => p.remove());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const inner = () => widget as unknown as {
  chartSettings: { openSettings(): void; applySettings(p: object): void };
  openRoles: { peek(): ReadonlySet<string> };
};
const tab = (name: string) => document.querySelector<HTMLButtonElement>(`[role="tab"][data-tab="${name}"]`)!.click();
/** The grid's own switch, "Show" in the Grid lines section. */
const gridToggle = () => document.querySelector<HTMLButtonElement>('.tcw-settings-section[aria-label="Grid lines"] button[aria-label="Show"]')!;
const shownOn = (btn: HTMLButtonElement) => btn.getAttribute('aria-checked') ?? btn.getAttribute('aria-pressed');
const toolbarButton = (role: string) => host.querySelector<HTMLButtonElement>(`.tcw-toolbar [data-role="${role}"]`)!;

describe('the open settings follow the Chart Settings', () => {
  it('show a setting read back from the chart while they are open', () => {
    inner().chartSettings.openSettings();
    tab('appearance');
    expect(shownOn(gridToggle())).toBe('true');
    // Set on the chart itself, then read back: the dialog shows it without being told.
    widget.getChart().setGridVisible(false);
    expect(widget.getSettings().gridVisible).toBe(false);
    expect(shownOn(gridToggle())).toBe('false');
  });

  it('show a change made from code, the keys or the palette', () => {
    inner().chartSettings.openSettings();
    tab('appearance');
    inner().chartSettings.applySettings({ gridVisible: false });
    expect(shownOn(gridToggle())).toBe('false');
    widget.setSettings({ gridVisible: true });
    expect(shownOn(gridToggle())).toBe('true');
  });

  it('are not built again for a change made in them', () => {
    inner().chartSettings.openSettings();
    tab('appearance');
    const toggle = gridToggle();
    toggle.click();
    // The same switch, not one built in its place under the pointer.
    expect(gridToggle()).toBe(toggle);
    expect(shownOn(toggle)).toBe('false');
    expect(widget.getSettings().gridVisible).toBe(false);
  });

  it('are not built again when nothing they show changed', () => {
    inner().chartSettings.openSettings();
    tab('appearance');
    const toggle = gridToggle();
    widget.getSettings();
    widget.setSettings({ gridVisible: true });
    expect(gridToggle()).toBe(toggle);
  });

  it('take the same settings written in another order as no change', () => {
    inner().chartSettings.openSettings();
    tab('appearance');
    inner().chartSettings.applySettings({ chartTypeOptions: { renko: { boxSize: 5, atrPeriod: 10 } } });
    const toggle = gridToggle();
    inner().chartSettings.applySettings({ chartTypeOptions: { renko: { atrPeriod: 10, boxSize: 5 } } });
    expect(gridToggle()).toBe(toggle);
  });
});

describe("the toolbar's panel buttons follow what is open", () => {
  it('the alerts and the object tree, opened and closed', () => {
    widget.openPanel('alerts');
    expect(toolbarButton('alerts').getAttribute('aria-pressed')).toBe('true');
    expect(inner().openRoles.peek().has('alerts')).toBe(true);
    widget.openPanel('objectTree');
    expect(toolbarButton('alerts').getAttribute('aria-pressed')).toBe('false');
    expect(toolbarButton('objects').getAttribute('aria-pressed')).toBe('true');
    widget.closePanel();
    expect(toolbarButton('objects').getAttribute('aria-pressed')).toBe('false');
    expect(inner().openRoles.peek().size).toBe(0);
  });

  it('the indicators dialog, on its button', () => {
    widget.toggleIndicatorPicker();
    expect(toolbarButton('indicators').getAttribute('aria-expanded')).toBe('true');
    expect(inner().openRoles.peek().has('indicators')).toBe(true);
    widget.toggleIndicatorPicker();
    expect(toolbarButton('indicators').getAttribute('aria-expanded')).toBe('false');
  });
});
