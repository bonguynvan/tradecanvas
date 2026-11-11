import { GRID_LAYOUT_SHAPES, GRID_LAYOUTS, gridAreas, gridChartCount, gridLargeSide, type GridLargeSide, type GridLayout, type GridShape } from '../grid/gridShapes.js';
import { fill, type MessageKey, type Translator } from './i18n.js';
import { createIcon } from './icons.js';

/** The icon's drawing box (its viewBox is 24, with this much room round the boxes). */
const ICON_INSET = 2;
const ICON_SPAN = 20;
const ICON_GAP = 2;
const ICON_SIZE = 16;
/** Room between the picker and the button it hangs under, and the edge it would touch (px). */
const PICKER_GAP = 2;
const PICKER_MARGIN = 4;

/** The label of an arrangement with one large chart, by the side it takes. */
const LARGE_SIDE_KEYS: Readonly<Record<GridLargeSide, MessageKey>> = {
  left: 'grid.layoutBigLeft',
  right: 'grid.layoutBigRight',
  top: 'grid.layoutBigTop',
  bottom: 'grid.layoutBigBottom',
};

/** Where a run of `span` cells, from cell `at` of `count`, starts and how long it is in the icon. */
function iconRun(at: number, span: number, count: number): [start: number, length: number] {
  const cell = (ICON_SPAN - ICON_GAP * (count - 1)) / count;
  return [ICON_INSET + at * (cell + ICON_GAP), span * cell + (span - 1) * ICON_GAP];
}

/** A small picture of an arrangement: a box for each chart, a large one over its cells. */
export function shapeIcon(shape: GridShape, size = ICON_SIZE): string {
  const rects = gridAreas(shape).map(([col, row, colSpan, rowSpan]) => {
    const [x, width] = iconRun(col, colSpan, shape.cols);
    const [y, height] = iconRun(row, rowSpan, shape.rows);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="1"/>`;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">${rects.join('')}</svg>`;
}

/** What an arrangement is called: by its columns and rows, or by where its large chart is. */
export function gridLayoutLabel(layout: GridLayout, t: Translator): string {
  const shape = GRID_LAYOUT_SHAPES[layout];
  const count = gridChartCount(shape);
  if (count === 1) return t('grid.single');
  const side = gridLargeSide(shape);
  if (side) return fill(t(LARGE_SIDE_KEYS[side]), { count });
  return fill(t('grid.layoutOption'), { count, cols: shape.cols, rows: shape.rows });
}

export interface GridLayoutPickerOptions {
  /** Where the picker opens (the grid's root). */
  host: HTMLElement;
  t: Translator;
  /** The arrangements offered; listed by chart count. */
  choices: readonly GridLayout[];
  /** The arrangement in use. */
  current: () => GridLayout;
  onPick: (layout: GridLayout) => void;
}

/**
 * The grid bar's arrangement button: it shows the arrangement in use and
 * opens a menu of them all, a row for each chart count. The arrows move
 * through it (up and down between counts), Enter picks, Escape closes it
 * and gives the keyboard back to the button, as a press outside does.
 */
export class GridLayoutPicker {
  readonly button: HTMLButtonElement;
  private panel: HTMLDivElement | null = null;
  private readonly choices: readonly GridLayout[];
  private readonly onDocPointer = (e: Event) => {
    const target = e.target as Node;
    if (!this.panel?.contains(target) && !this.button.contains(target)) this.close(false);
  };
  private readonly onAway = () => this.close(false);

  constructor(private readonly options: GridLayoutPickerOptions) {
    // In the table's order, which lists them by count, whatever order they were given in.
    const given = new Set(options.choices);
    this.choices = GRID_LAYOUTS.filter((l) => given.has(l));
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'tcw-dropdown-trigger tcw-grid-layout-btn';
    this.button.setAttribute('aria-haspopup', 'menu');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.addEventListener('click', () => (this.isOpen() ? this.close() : this.open()));
    this.render();
  }

  /** Show the arrangement in use on the button (and in the menu, when open). */
  render(): void {
    const { t, current } = this.options;
    const layout = current();
    const label = `${t('grid.layout')}: ${gridLayoutLabel(layout, t)}`;
    this.button.innerHTML = shapeIcon(GRID_LAYOUT_SHAPES[layout]) + createIcon('chevronDown', 12);
    this.button.title = label;
    this.button.setAttribute('aria-label', label);
    for (const item of this.items()) item.setAttribute('aria-checked', String(item.dataset.layout === layout));
  }

  isOpen(): boolean {
    return this.panel !== null && !this.panel.hidden;
  }

  open(): void {
    const panel = this.panel ?? this.build();
    this.render();
    panel.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.place(panel);
    document.addEventListener('pointerdown', this.onDocPointer, true);
    window.addEventListener('resize', this.onAway);
    window.addEventListener('blur', this.onAway);
    const items = this.items();
    (items.find((i) => i.getAttribute('aria-checked') === 'true') ?? items[0])?.focus({ preventScroll: true });
  }

  /** Close it; `refocus` gives the keyboard back to the button (not after a press elsewhere). */
  close(refocus = true): void {
    if (!this.isOpen()) return;
    this.panel!.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', this.onDocPointer, true);
    window.removeEventListener('resize', this.onAway);
    window.removeEventListener('blur', this.onAway);
    if (refocus) this.button.focus({ preventScroll: true });
  }

  destroy(): void {
    this.close(false);
    this.panel?.remove();
    this.panel = null;
    this.button.remove();
  }

  private build(): HTMLDivElement {
    const { t, host } = this.options;
    const panel = document.createElement('div');
    panel.className = 'tcw-context-menu tcw-grid-picker';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', t('grid.layout'));
    panel.hidden = true;
    for (const [count, layouts] of this.byCount()) panel.appendChild(this.group(count, layouts));
    panel.addEventListener('keydown', (e) => this.onKeyDown(e));
    host.appendChild(panel);
    this.panel = panel;
    return panel;
  }

  /** The choices by chart count, fewest first. */
  private byCount(): Map<number, GridLayout[]> {
    const groups = new Map<number, GridLayout[]>();
    for (const layout of this.choices) {
      const count = gridChartCount(GRID_LAYOUT_SHAPES[layout]);
      groups.set(count, [...(groups.get(count) ?? []), layout]);
    }
    return groups;
  }

  /** A row of the menu: the count, then a button for each of its arrangements. */
  private group(count: number, layouts: readonly GridLayout[]): HTMLElement {
    const { t } = this.options;
    const group = document.createElement('div');
    group.className = 'tcw-grid-picker-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', count === 1 ? t('grid.single') : fill(t('grid.layoutCount'), { count }));
    const heading = document.createElement('span');
    heading.className = 'tcw-grid-picker-count';
    heading.setAttribute('aria-hidden', 'true');
    heading.textContent = String(count);
    const row = document.createElement('div');
    row.className = 'tcw-grid-picker-row';
    row.append(...layouts.map((layout) => this.item(layout)));
    group.append(heading, row);
    return group;
  }

  private item(layout: GridLayout): HTMLButtonElement {
    const label = gridLayoutLabel(layout, this.options.t);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tcw-btn-icon tcw-grid-picker-item';
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute('aria-checked', 'false');
    item.tabIndex = -1;
    item.dataset.layout = layout;
    item.title = label;
    item.setAttribute('aria-label', label);
    item.innerHTML = shapeIcon(GRID_LAYOUT_SHAPES[layout]);
    item.addEventListener('click', () => this.pick(layout));
    return item;
  }

  private pick(layout: GridLayout): void {
    this.close();
    this.options.onPick(layout);
    this.render();
  }

  /** Under the button, from its start edge; kept inside the host. A phone's stylesheet makes it a sheet. */
  private place(panel: HTMLDivElement): void {
    const { host } = this.options;
    const at = this.button.getBoundingClientRect();
    const box = host.getBoundingClientRect();
    const rtl = host.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const width = panel.offsetWidth;
    const start = rtl ? at.right - box.left - width : at.left - box.left;
    const room = host.clientWidth - width - PICKER_MARGIN;
    panel.style.left = `${Math.max(0, Math.min(start, room))}px`;
    panel.style.top = `${at.bottom - box.top + PICKER_GAP}px`;
    panel.style.maxHeight = `${Math.max(0, host.clientHeight - (at.bottom - box.top) - PICKER_GAP - PICKER_MARGIN)}px`;
  }

  private items(): HTMLButtonElement[] {
    return this.panel ? [...this.panel.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')] : [];
  }

  /** The menu's rows of buttons, a row for each count. */
  private rows(): HTMLButtonElement[][] {
    if (!this.panel) return [];
    return [...this.panel.querySelectorAll('.tcw-grid-picker-row')]
      .map((row) => [...row.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')]);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const focused = document.activeElement as HTMLButtonElement | null;
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && focused?.dataset.layout) {
      e.preventDefault();
      this.pick(focused.dataset.layout as GridLayout);
      return;
    }
    const next = this.moveFrom(focused, e.key);
    if (!next) return;
    e.preventDefault();
    next.focus({ preventScroll: true });
  }

  /** The button an arrow (or Home, End) moves to from `from`; null for another key. */
  private moveFrom(from: HTMLButtonElement | null, key: string): HTMLButtonElement | null {
    const items = this.items();
    const at = Math.max(0, items.indexOf(from as HTMLButtonElement));
    const rtl = this.options.host.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const [forward, back] = rtl ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
    if (key === forward) return items[(at + 1) % items.length];
    if (key === back) return items[(at - 1 + items.length) % items.length];
    if (key === 'Home') return items[0];
    if (key === 'End') return items[items.length - 1];
    if (key !== 'ArrowDown' && key !== 'ArrowUp') return null;
    const rows = this.rows();
    const row = rows.findIndex((r) => r.includes(items[at]));
    const col = rows[row].indexOf(items[at]);
    const target = rows[(row + (key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length];
    return target[Math.min(col, target.length - 1)];
  }
}
