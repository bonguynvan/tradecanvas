// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FIBONACCI, PHI, SANS_FONT_FAMILY, evenPx } from '@tradecanvas/commons';
import { applyWidgetUI, resolveWidgetUI, scaledWidgetUI, typeSize, widgetScaleFor, widgetUIVariables, WIDGET_UI_PRESETS, type WidgetUIPreset, type WidgetUITheme } from '../widgetUI.js';
import { injectWidgetStyles, removeWidgetStyles } from '../WidgetStyles.js';

describe('resolveWidgetUI', () => {
  it('is the Print look by default', () => {
    const ui = resolveWidgetUI();
    expect(ui.preset).toBe('print');
    expect(ui).toMatchObject({ toolbar: 'docked', sidebar: 'docked', intervals: 'plain', active: 'solid', borders: { separators: true }, font: { labelCase: 'none', strongWeight: 500 }, iconStroke: 1 });
    expect(ui.components.menu).toBe(ui.radius.lg);
    expect(ui).toEqual(resolveWidgetUI('print'));
  });

  it('keeps Print to the golden ratio: sizes in half steps of φ, corners Fibonacci numbers', () => {
    const { sizes, radius, components, tagRadius } = resolveWidgetUI('print');
    // An icon, its small button, its button, the bar: each √φ the one before, on even pixels.
    const ladder = [sizes.icon, sizes.controlSmall, sizes.control, sizes.toolbar];
    expect(ladder).toEqual([20, 26, 34, 42]);
    // The ladder from 16 is 20.4, 25.9, 32.9, 41.9: each size the even number nearest its step,
    // but the button, 34 where 32 is nearer: the size the 33 of 1.x read as.
    const steps = ladder.map((_, n) => 16 * PHI ** ((n + 1) / 2));
    expect(ladder.map((size, n) => size - evenPx(steps[n]))).toEqual([0, 0, 2, 0]);
    for (const [size, step] of ladder.map((size, n) => [size, steps[n]])) expect(Math.abs(size - step)).toBeLessThan(1.2);
    for (const size of Object.values(sizes)) expect(size % 2, String(size)).toBe(0);
    // What is centred sits on whole pixels: an icon in a button, a button in the bar.
    expect((sizes.control - sizes.icon) / 2).toBe(7);
    expect((sizes.toolbar - sizes.control) / 2).toBe(4);
    // The drawing tools' column on the same step as the bar: its buttons, and no more.
    expect(sizes.sidebar).toBe(sizes.toolbar);
    // A menu row is as tall as a button.
    expect(sizes.menuItem).toBe(sizes.control);
    for (const r of [...Object.values(radius), ...Object.values(components), tagRadius]) {
      expect(r === 0 || (FIBONACCI as readonly number[]).includes(r), String(r)).toBe(true);
    }
  });

  it('draws the drawing tools a half step of φ over the other buttons, and keeps them so when compact', () => {
    const vars = (theme: WidgetUITheme) => widgetUIVariables(resolveWidgetUI(theme));
    // Print: a 34 button and a 20 icon elsewhere; a 26 icon in a 42 column, its button
    // short of the half step (44) to keep 3 px either side: big icons, a narrow column.
    expect(vars({})).toMatchObject({ '--tcw-tool-h': '36px', '--tcw-tool-icon': '26px', '--tcw-sidebar-w': '42px' });
    expect(vars({ density: 'spacious' })).toMatchObject({ '--tcw-tool-h': '54px', '--tcw-tool-icon': '34px', '--tcw-sidebar-w': '60px' });
    expect(vars({ density: 'compact' })).toMatchObject({ '--tcw-tool-h': '26px', '--tcw-tool-icon': '16px', '--tcw-sidebar-w': '32px' });
    // Each look's column holds its tool with a little room either side, tool and icon even sizes:
    // the icon is centred on whole pixels in its button, and the button in its column.
    for (const preset of ['print', 'studio', 'terminal', 'capsule', 'desk'] as const) {
      for (const density of ['comfortable', 'spacious'] as const) {
        const v = vars({ preset, density });
        const tool = parseInt(v['--tcw-tool-h']);
        const icon = parseInt(v['--tcw-tool-icon']);
        const column = parseInt(v['--tcw-sidebar-w']);
        expect(tool, preset).toBeGreaterThan(resolveWidgetUI({ preset, density }).sizes.control);
        expect([tool % 2, icon % 2, column % 2], `${preset} ${density}`).toEqual([0, 0, 0]);
        expect(column - tool, preset).toBeGreaterThanOrEqual(6);
        expect(column - tool, preset).toBeLessThanOrEqual(8);
      }
    }
  });

  it('sets every look on even pixels: sizes, spacing, and what is centred in what', () => {
    const vars = (theme: WidgetUITheme) => widgetUIVariables(resolveWidgetUI(theme));
    for (const preset of ['print', 'studio', 'terminal', 'capsule', 'desk'] as const) {
      for (const density of ['comfortable', 'spacious', 'airy'] as const) {
        const ui = resolveWidgetUI({ preset, density });
        for (const [name, size] of Object.entries(ui.sizes)) expect(size % 2, `${preset} ${density} ${name}`).toBe(0);
        // On a wide screen too, at each step the look grows by.
        for (const width of [1920, 2560, 3840]) {
          const grown = scaledWidgetUI(ui, widgetScaleFor(width));
          for (const [name, size] of Object.entries(grown.sizes)) expect(size % 2, `${preset} ${density} ${name} at ${width}`).toBe(0);
          const v = widgetUIVariables(grown);
          expect(parseInt(v['--tcw-tool-h']) % 2, `${preset} ${density} tool at ${width}`).toBe(0);
          // A line of body text is an even height at the grown type size.
          const line = parseFloat(v['--tcw-line-height']) * grown.font.size;
          expect(Math.abs(line - Math.round(line)), `${preset} line at ${width}`).toBeLessThan(1e-3);
          expect(Math.round(line) % 2, `${preset} line at ${width}`).toBe(0);
        }
      }
    }
    const v = vars({});
    expect([1, 2, 3, 4, 5, 6, 7].map((n) => v[`--tcw-space-${n}`])).toEqual(['2px', '4px', '6px', '8px', '12px', '20px', '32px']);
    expect(v).toMatchObject({ '--tcw-control-pad': '12px', '--tcw-bar-pad': '12px', '--tcw-menu-row-pad': '12px', '--tcw-legend-line': '20px', '--tcw-legend-line-pane': '16px', '--tcw-line-xs': '14px' });
    // 18 px a line at 13 px.
    expect(parseFloat(v['--tcw-line-height']) * 13).toBeCloseTo(18, 3);
  });

  it('keeps the classic density as the widget was before 2.0: its sizes, spacing, padding and lines', () => {
    const vars = (theme: WidgetUITheme) => widgetUIVariables(resolveWidgetUI(theme));
    const classic = (preset: WidgetUIPreset) => resolveWidgetUI({ preset, density: 'classic' });
    expect(classic('print').density).toBe('classic');
    expect(classic('print').sizes).toEqual({ toolbar: 42, control: 33, controlSmall: 26, icon: 20, sidebar: 42, menuItem: 33 });
    expect(classic('studio').sizes).toEqual({ toolbar: 46, control: 30, controlSmall: 24, icon: 18, sidebar: 44, menuItem: 30 });
    expect(classic('terminal').sizes).toEqual({ toolbar: 36, control: 26, controlSmall: 20, icon: 16, sidebar: 39, menuItem: 26 });
    expect(classic('capsule').sizes).toEqual({ toolbar: 44, control: 32, controlSmall: 26, icon: 18, sidebar: 47, menuItem: 34 });
    expect(classic('desk').sizes).toEqual({ toolbar: 34, control: 24, controlSmall: 20, icon: 16, sidebar: 37, menuItem: 24 });
    for (const density of ['classic', 'compact'] as const) {
      const v = vars({ density });
      expect([1, 2, 3, 4, 5, 6, 7].map((n) => v[`--tcw-space-${n}`]), density).toEqual(['2px', '3px', '5px', '8px', '13px', '21px', '34px']);
      expect(v, density).toMatchObject({
        '--tcw-control-pad': '8px', '--tcw-bar-pad': '8px', '--tcw-menu-row-pad': '8px',
        '--tcw-line-height': '1.4', '--tcw-line-xs': '1.4', '--tcw-legend-line': '19px', '--tcw-legend-line-pane': '15px', '--tcw-text-w': 'auto',
      });
    }
    // The tools as they were: a half step over a 33 button is 42, held to 36 by the 42 column.
    expect(vars({ density: 'classic' })).toMatchObject({ '--tcw-tool-h': '36px', '--tcw-tool-icon': '26px', '--tcw-control-h': '33px' });
    expect(vars({ preset: 'terminal', density: 'classic' })).toMatchObject({ '--tcw-tool-h': '33px', '--tcw-tool-icon': '20px', '--tcw-sidebar-w': '39px' });
    // And on a wide screen its sizes round as they did, odd ones and all.
    expect(scaledWidgetUI(classic('print'), widgetScaleFor(2560)).sizes).toEqual({ toolbar: 49, control: 39, controlSmall: 31, icon: 23, sidebar: 49, menuItem: 39 });
    expect(resolveWidgetUI(classic('print'))).toEqual(classic('print'));
  });

  it('draws Print’s icons in fine lines, the same width at every size, and the other looks’ as drawn', () => {
    expect(widgetUIVariables(resolveWidgetUI('print'))['--tcw-icon-stroke']).toBe('1px');
    for (const preset of ['studio', 'terminal', 'capsule', 'desk'] as const) {
      expect(resolveWidgetUI(preset).iconStroke, preset).toBe(0);
    }
    expect(resolveWidgetUI({ preset: 'studio', iconStroke: 1 }).iconStroke).toBe(1);
    expect(resolveWidgetUI({ iconStroke: 0 }).iconStroke).toBe(0);
    for (const bad of [0.2, 4, -1, Number.NaN, '1px']) {
      expect(resolveWidgetUI({ iconStroke: bad as never }).iconStroke, String(bad)).toBe(1);
    }
    // The line width is a switch on the root: a look that draws them as they are leaves them be.
    const el = document.createElement('div');
    applyWidgetUI(el, resolveWidgetUI('print'));
    expect(el.dataset.tcwIconStroke).toBe('set');
    applyWidgetUI(el, resolveWidgetUI('studio'));
    expect(el.dataset.tcwIconStroke).toBe('drawn');
  });

  it('sets labels as written a size up from labels in capitals, which read at the smaller one', () => {
    expect(widgetUIVariables(resolveWidgetUI('print'))['--tcw-label-size']).toBe('11px');
    expect(widgetUIVariables(resolveWidgetUI('terminal'))['--tcw-label-size']).toBe('10px');
  });

  it('writes Print in its system’s own face, the lighter one on Windows 11', () => {
    const family = resolveWidgetUI('print').font.family;
    expect(family.indexOf("'Segoe UI Variable Text'")).toBeGreaterThanOrEqual(0);
    expect(family.indexOf("'Segoe UI Variable Text'")).toBeLessThan(family.indexOf("'Segoe UI'"));
    expect(family.startsWith('-apple-system')).toBe(true);
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
    expect(resolveWidgetUI({ density: 'compact' }).sizes).toEqual({ toolbar: 33, control: 26, controlSmall: 20, icon: 16, sidebar: 32, menuItem: 26 });
    // Spacious on even pixels: the steps 53.3 and 59 are 54 and 60, the 33 button 34.
    expect(resolveWidgetUI({ density: 'spacious' }).sizes).toEqual({ toolbar: 54, control: 42, controlSmall: 34, icon: 26, sidebar: 60, menuItem: 42 });
    for (const preset of ['studio', 'terminal', 'capsule'] as const) {
      expect(resolveWidgetUI({ preset, density: 'compact' }).sizes, preset).toEqual({ toolbar: 38, control: 26, controlSmall: 20, icon: 16, sidebar: 32, menuItem: 26 });
      expect(resolveWidgetUI({ preset, density: 'spacious' }).sizes, preset).toEqual({ toolbar: 52, control: 34, controlSmall: 28, icon: 20, sidebar: 50, menuItem: 34 });
    }
  });

  it('writes Print’s figures in a sans face whose digits are one width on every system, as the chart draws them too', () => {
    // Canvas text can't turn on tabular figures, so San Francisco (proportional digits) stays out.
    const mono = resolveWidgetUI().font.mono;
    expect(mono.split(',')[0]).toBe("'Segoe UI'");
    expect(mono).not.toMatch(/apple-system|BlinkMacSystemFont|system-ui/);
    expect(mono).not.toBe(SANS_FONT_FAMILY);
  });

  it('has a Desk look: Tahoma throughout, small type, square corners, compact bars', () => {
    const desk = resolveWidgetUI('desk');
    expect(desk.preset).toBe('desk');
    expect(desk.font.family).toMatch(/^Tahoma,/);
    expect(desk.font.mono).toBe(desk.font.family);
    expect(desk.font.size).toBe(12);
    expect(desk.tagRadius).toBe(0);
    expect(desk.sizes).toMatchObject({ toolbar: 34, control: 24 });
  });

  it('takes the airy density: spacious controls, the figures in the look’s sans face', () => {
    const airy = resolveWidgetUI({ density: 'airy' });
    expect(airy.density).toBe('airy');
    expect(airy.sizes).toEqual(resolveWidgetUI({ density: 'spacious' }).sizes);
    // Print's sans face for figures is plain Segoe UI: Segoe UI Variable's digits are not one width.
    expect(airy.font.mono).toBe(SANS_FONT_FAMILY);
    expect(resolveWidgetUI({ preset: 'studio', density: 'airy' }).font.mono).toBe(resolveWidgetUI('studio').font.family);
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
      for (const density of ['compact', 'classic', 'comfortable', 'spacious', 'airy'] as const) {
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

describe('the look on a wide screen', () => {
  it('grows by thirds of φ as the widget widens: none on a laptop, a sixth from full HD, more on 4K', () => {
    expect(widgetScaleFor(1280)).toBe(1);
    expect(widgetScaleFor(1920)).toBeCloseTo(PHI ** (1 / 6));
    expect(widgetScaleFor(2560)).toBeCloseTo(PHI ** (1 / 3));
    expect(widgetScaleFor(3840)).toBeCloseTo(PHI ** (1 / 2));
  });

  it('scales the bars, buttons, icons and type, and leaves the corners', () => {
    const base = resolveWidgetUI('print');
    const big = scaledWidgetUI(base, widgetScaleFor(2560));
    // Each to the even number nearest: 49.3, 39.9, 30.5 and 23.5.
    expect(big.sizes).toEqual({ toolbar: 50, control: 40, controlSmall: 30, icon: 24, sidebar: 50, menuItem: 40 });
    // The icons' lines stay as fine on a wide screen.
    expect(big.iconStroke).toBe(base.iconStroke);
    expect(big.font.size).toBe(15);
    expect(big.radius).toEqual(base.radius);
    expect(scaledWidgetUI(base, 1)).toEqual(base);
  });

  it('takes a scale of your own, or none: 1 keeps the sizes at every width', () => {
    expect(resolveWidgetUI().scale).toBe('auto');
    expect(resolveWidgetUI({ scale: 1 }).scale).toBe(1);
    expect(resolveWidgetUI({ scale: 1.2 }).scale).toBe(1.2);
    expect(resolveWidgetUI({ scale: 9 as never }).scale).toBe('auto');
  });
});
