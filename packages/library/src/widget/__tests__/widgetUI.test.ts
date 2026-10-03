// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { applyWidgetUI, resolveWidgetUI, widgetUIVariables, WIDGET_UI_PRESETS } from '../widgetUI.js';

describe('resolveWidgetUI', () => {
  it('is the Studio look by default', () => {
    const ui = resolveWidgetUI();
    expect(ui.preset).toBe('studio');
    expect(ui).toMatchObject({ toolbar: 'docked', sidebar: 'docked', intervals: 'segmented', active: 'tint', borders: { separators: false } });
    expect(ui.radius.md).toBe(7);
    expect(ui.components.menu).toBe(ui.radius.lg);
    expect(ui).toEqual(resolveWidgetUI('studio'));
  });

  it('takes a preset by name', () => {
    const terminal = resolveWidgetUI('terminal');
    expect(terminal).toMatchObject({ preset: 'terminal', active: 'underline', borders: { separators: true }, font: { labelCase: 'uppercase' } });
    expect(terminal.sizes.control).toBeLessThan(resolveWidgetUI().sizes.control);
    const capsule = resolveWidgetUI('capsule');
    expect(capsule).toMatchObject({ toolbar: 'floating', sidebar: 'floating', active: 'solid' });
    expect(capsule.components.control).toBe(999);
    expect(capsule.blur).toBeGreaterThan(0);
  });

  it('lays your settings over a preset; component corners follow the scale unless set', () => {
    const ui = resolveWidgetUI({ preset: 'terminal', radius: { md: 6, lg: 12 }, components: { dialog: 20 }, toolbar: 'floating' });
    expect(ui.components.control).toBe(6);
    expect(ui.components.menu).toBe(12);
    expect(ui.components.dialog).toBe(20);
    expect(ui.toolbar).toBe('floating');
    expect(ui.borders.separators).toBe(true); // still the preset's
  });

  it('sizes controls by density, and explicit sizes win', () => {
    const compact = resolveWidgetUI({ density: 'compact' });
    const spacious = resolveWidgetUI({ density: 'spacious' });
    expect(compact.sizes.control).toBeLessThan(resolveWidgetUI().sizes.control);
    expect(spacious.sizes.control).toBeGreaterThan(resolveWidgetUI().sizes.control);
    expect(resolveWidgetUI({ density: 'compact', sizes: { control: 40 } }).sizes.control).toBe(40);
  });

  it('leaves out what it can’t use', () => {
    const ui = resolveWidgetUI({
      preset: 'nope' as never,
      radius: { md: -4, lg: Number.NaN },
      sizes: { control: 3, toolbar: 900 },
      font: { family: 'Evil; } body { display: none', size: 0 },
      shadows: { menu: 'url(x)' },
      active: 'glow' as never,
    });
    const studio = resolveWidgetUI();
    expect(ui.preset).toBe('studio');
    expect(ui.radius).toEqual(studio.radius);
    expect(ui.sizes.control).toBe(studio.sizes.control);
    expect(ui.sizes.toolbar).toBe(studio.sizes.toolbar);
    expect(ui.font.family).toBe(studio.font.family);
    expect(ui.font.size).toBe(studio.font.size);
    expect(ui.shadows.menu).toBe(studio.shadows.menu);
    expect(ui.active).toBe('tint');
  });

  it('hands out copies of the presets', () => {
    const ui = resolveWidgetUI('capsule');
    ui.radius.md = 1;
    expect(resolveWidgetUI('capsule').radius.md).toBe(WIDGET_UI_PRESETS.capsule.radius.md);
  });
});

describe('the look on the page', () => {
  it('is CSS variables and data attributes on the widget’s element', () => {
    const vars = widgetUIVariables(resolveWidgetUI('terminal'));
    expect(vars['--tcw-control-h']).toBe('26px');
    expect(vars['--tcw-label-case']).toBe('uppercase');
    expect(vars['--tcw-sep-w']).toBe('1px');

    const el = document.createElement('div');
    applyWidgetUI(el, resolveWidgetUI('capsule'));
    expect(el.style.getPropertyValue('--tcw-control-radius')).toBe('999px');
    expect(el.dataset.tcwToolbar).toBe('floating');
    expect(el.dataset.tcwSidebar).toBe('floating');
    expect(el.dataset.tcwActive).toBe('solid');
    expect(el.dataset.tcwSeparators).toBe('off');

    applyWidgetUI(el, resolveWidgetUI('studio'));
    expect(el.dataset.tcwToolbar).toBe('docked');
    expect(el.style.getPropertyValue('--tcw-control-radius')).toBe('7px');
  });
});
