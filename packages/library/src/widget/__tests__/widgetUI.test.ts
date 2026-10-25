// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FIBONACCI, phiStep } from '@tradecanvas/commons';
import { applyWidgetUI, resolveWidgetUI, typeSize, widgetUIVariables, WIDGET_UI_PRESETS, type WidgetUITheme } from '../widgetUI.js';
import { injectWidgetStyles, removeWidgetStyles } from '../WidgetStyles.js';

describe('resolveWidgetUI', () => {
  it('is the Print look by default', () => {
    const ui = resolveWidgetUI();
    expect(ui.preset).toBe('print');
    expect(ui).toMatchObject({ toolbar: 'docked', sidebar: 'docked', intervals: 'plain', active: 'solid', borders: { separators: true }, font: { labelCase: 'uppercase' } });
    expect(ui.components.menu).toBe(ui.radius.lg);
    expect(ui).toEqual(resolveWidgetUI('print'));
  });

  it('keeps Print to the golden ratio: sizes in half steps of φ, corners Fibonacci numbers', () => {
    const { sizes, radius, components, tagRadius } = resolveWidgetUI('print');
    // An icon, its small button, its button, a menu row, the bar: each √φ the one before.
    const ladder = [sizes.icon, sizes.controlSmall, sizes.control, sizes.menuItem, sizes.toolbar];
    expect(ladder).toEqual(ladder.map((_, n) => phiStep(sizes.icon, n, 2)));
    expect(sizes.sidebar).toBe(sizes.toolbar);
    for (const r of [...Object.values(radius), ...Object.values(components), tagRadius]) {
      expect(r === 0 || (FIBONACCI as readonly number[]).includes(r), String(r)).toBe(true);
    }
  });

  it('sets type on a scale of thirds of φ, never under 10px', () => {
    expect([-2, -1, 0, 1, 2, 3].map((n) => typeSize(13, n))).toEqual([10, 11, 13, 15, 18, 21]);
    const vars = widgetUIVariables(resolveWidgetUI('print'));
    expect(['xs', 'sm', 'lg', 'xl', 'display'].map((n) => vars[`--tcw-font-size-${n}`])).toEqual(['10px', '11px', '15px', '18px', '21px']);
    expect(vars['--tcw-font-size']).toBe('13px');
    expect(widgetUIVariables(resolveWidgetUI('terminal'))['--tcw-font-size-xs']).toBe('10px');
  });

  it('takes a preset by name', () => {
    const terminal = resolveWidgetUI('terminal');
    expect(terminal).toMatchObject({ preset: 'terminal', active: 'underline', borders: { separators: true }, font: { labelCase: 'uppercase' } });
    expect(terminal.sizes.control).toBeLessThan(resolveWidgetUI('studio').sizes.control);
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

  it('moves Print’s sizes a half step of φ by density, and keeps the other looks’ density sizes', () => {
    expect(resolveWidgetUI({ density: 'compact' }).sizes).toEqual({ toolbar: 33, control: 20, controlSmall: 20, icon: 16, sidebar: 33, menuItem: 26 });
    expect(resolveWidgetUI({ density: 'spacious' }).sizes).toEqual({ toolbar: 53, control: 33, controlSmall: 26, icon: 20, sidebar: 53, menuItem: 42 });
    for (const preset of ['studio', 'terminal', 'capsule'] as const) {
      expect(resolveWidgetUI({ preset, density: 'compact' }).sizes, preset).toEqual({ toolbar: 38, control: 26, controlSmall: 20, icon: 16, sidebar: 40, menuItem: 26 });
      expect(resolveWidgetUI({ preset, density: 'spacious' }).sizes, preset).toEqual({ toolbar: 52, control: 34, controlSmall: 28, icon: 20, sidebar: 54, menuItem: 34 });
    }
  });

  it('takes the airy density: spacious controls, the figures in the look’s sans face', () => {
    const airy = resolveWidgetUI({ density: 'airy' });
    expect(airy.density).toBe('airy');
    expect(airy.sizes).toEqual(resolveWidgetUI({ density: 'spacious' }).sizes);
    expect(airy.font.mono).toBe(airy.font.family);
    expect(resolveWidgetUI({ density: 'airy', font: { mono: 'Plex Mono' } }).font.mono).toBe('Plex Mono');
    expect(resolveWidgetUI().density).toBe('comfortable');
    expect(resolveWidgetUI(airy)).toEqual(airy);
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
    const base = resolveWidgetUI();
    expect(ui.preset).toBe('print');
    expect(ui.radius).toEqual(base.radius);
    expect(ui.sizes.control).toBe(base.sizes.control);
    expect(ui.sizes.toolbar).toBe(base.sizes.toolbar);
    expect(ui.font.family).toBe(base.font.family);
    expect(ui.font.size).toBe(base.font.size);
    expect(ui.shadows.menu).toBe(base.shadows.menu);
    expect(ui.active).toBe('solid');
  });

  it('leaves out every kind of value it can’t use', () => {
    const base = resolveWidgetUI();
    const bad = {
      font: { mono: 'expression(alert(1))', labelCase: 'shout', labelTracking: 2, size: 10, weight: 50 },
      borders: { width: 9, separators: 'yes' },
      components: { menu: -1, dialog: Number.POSITIVE_INFINITY },
      shadows: { dialog: '<b>', tooltip: 'a\\b' },
      blur: 100,
      tagRadius: Number.NaN,
      toolbar: 'top',
      sidebar: 1,
      intervals: 'x',
    } as unknown as WidgetUITheme;
    expect(resolveWidgetUI(bad)).toEqual(base);
    // CSS the browser would drop: an open quote, an open bracket, a comment, too long.
    for (const family of ["'Inter", 'a) b', 'Inter /* x', 'x'.repeat(301), 5]) {
      expect(resolveWidgetUI({ font: { family } } as unknown as WidgetUITheme).font.family, String(family)).toBe(base.font.family);
    }
    expect(resolveWidgetUI({ font: { family: "'Inter', var(--brand-font), sans-serif" } }).font.family).toBe("'Inter', var(--brand-font), sans-serif");
  });

  it('is Print for anything that isn’t a look', () => {
    for (const theme of [null, 5, [], 'nope']) {
      expect(resolveWidgetUI(theme as never), String(theme)).toEqual(resolveWidgetUI('print'));
    }
  });

  it('takes a resolved look back unchanged', () => {
    for (const name of ['print', 'studio', 'terminal', 'capsule'] as const) {
      const ui = resolveWidgetUI({ preset: name, density: 'spacious', radius: { md: 3 } });
      expect(resolveWidgetUI(ui)).toEqual(ui);
    }
  });

  it('hands out copies of the presets', () => {
    const ui = resolveWidgetUI('capsule');
    ui.radius.md = 1;
    expect(resolveWidgetUI('capsule').radius.md).toBe(WIDGET_UI_PRESETS.capsule.radius.md);
    ui.components.menu = 1;
    ui.font.size = 1;
    ui.shadows.menu = 'none';
    expect(resolveWidgetUI('capsule')).toEqual(WIDGET_UI_PRESETS.capsule);
    expect(Object.isFrozen(WIDGET_UI_PRESETS.capsule.components)).toBe(true);
    expect(Object.isFrozen(WIDGET_UI_PRESETS.terminal.font)).toBe(true);
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

  it('can leave the tokens to the stylesheet: the switches only, inline tokens cleared', () => {
    const el = document.createElement('div');
    applyWidgetUI(el, resolveWidgetUI('capsule'));
    applyWidgetUI(el, resolveWidgetUI('studio'), { variables: false });
    expect(el.dataset.tcwUi).toBe('studio');
    expect(el.dataset.tcwToolbar).toBe('docked');
    expect(el.style.getPropertyValue('--tcw-control-radius')).toBe('');
    expect(el.style.length).toBe(0);
  });

  it('emits a value for every token, in every preset and density', () => {
    for (const preset of ['print', 'studio', 'terminal', 'capsule'] as const) {
      for (const density of ['compact', 'comfortable', 'spacious'] as const) {
        for (const [name, value] of Object.entries(widgetUIVariables(resolveWidgetUI({ preset, density })))) {
          expect(value, `${preset} ${density} ${name}`).not.toMatch(/NaN|undefined|^$/);
        }
      }
    }
  });

  it('puts the widget stylesheet first in the page head, so the page’s own CSS wins a tie', () => {
    document.head.innerHTML = '<style id="host-css"></style>';
    injectWidgetStyles();
    try {
      expect(document.head.firstElementChild?.id).toBe('tcw-styles');
    } finally {
      removeWidgetStyles();
    }
    expect(document.getElementById('tcw-styles')).toBeNull();
  });

  it('frosts floating surfaces only when they blur', () => {
    expect(widgetUIVariables(resolveWidgetUI('capsule'))['--tcw-surface-opacity']).not.toBe('100%');
    expect(widgetUIVariables(resolveWidgetUI('studio'))['--tcw-surface-opacity']).toBe('100%');
    expect(widgetUIVariables(resolveWidgetUI({ blur: 8 }))['--tcw-surface-opacity']).not.toBe('100%');
  });

  it('draws shadows from the theme’s tokens, so they suit dark and light', () => {
    for (const name of ['print', 'studio', 'terminal', 'capsule'] as const) {
      const { menu, dialog } = WIDGET_UI_PRESETS[name].shadows;
      expect(menu, name).toMatch(/var\(--tcw-/);
      expect(dialog, name).toMatch(/var\(--tcw-/);
    }
  });
});
