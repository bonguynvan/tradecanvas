import type { CrosshairCursor, DrawingToolType } from '@tradecanvas/commons';
import type { SidebarButtonSpec, SidebarConfig, SidebarCallbacks, WidgetState } from './types.js';
import { createIcon, createToolIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type MessageKey, type Translator } from './i18n.js';
import { WIDGET_FEATURES, markPart, tidyDividers, type WidgetFeature } from './widgetFeatures.js';
import { watchToolFit } from './toolFit.js';

/** Drawing tool icons carry more detail than interface glyphs: a size up. */
const TOOL_ICON_PX = 16;

/** How long a tool menu stays after the pointer leaves it. */
const FLYOUT_CLOSE_DELAY_MS = 150;
/**
 * How long another button's menu waits to take the place of one open: a
 * pointer heading down into a menu crosses the buttons under its own, and
 * reaches the menu sooner. Shorter than the close delay, so a real switch
 * never shows the column with no menu.
 */
const FLYOUT_SWITCH_DELAY_MS = 120;
/** The cursor button's menu among the menus, which number the drawing groups from 0. */
const CURSOR_MENU = -2;
/** The cursor kinds in the menu's order, with their icons and names. */
const CURSOR_KINDS: readonly { kind: CrosshairCursor; icon: string; label: MessageKey }[] = [
  { kind: 'cross', icon: 'crosshairCursor', label: 'drawing.cursorCross' },
  { kind: 'dot', icon: 'dotCursor', label: 'drawing.cursorDot' },
  { kind: 'arrow', icon: 'cursor', label: 'drawing.cursorArrow' },
];
/** Room kept between a tool menu and the bottom of the chart (px). */
const FLYOUT_MARGIN = 4;

/** The switch for a section of tools (`sidebar.lines`…), when there is one. */
function sectionFeature(section: string | undefined): WidgetFeature | null {
  const name = `sidebar.${section}`;
  return (WIDGET_FEATURES as readonly string[]).includes(name) ? (name as WidgetFeature) : null;
}

/** Human label for a tool id, sourced from the configured groups. */
function toolLabel(groups: SidebarConfig['drawingToolGroups'], tool: string): string {
  for (const g of groups) {
    const t = g.tools.find((x) => x.value === tool);
    if (t) return t.label;
  }
  return tool;
}
/** The custom property that tells the drawing button's stylesheet where the plot starts. */
const FAB_PLOT_LEFT = '--tcw-fab-plot-left';


export class WidgetDrawingSidebar {
  private config: SidebarConfig;
  private callbacks: SidebarCallbacks;
  private el: HTMLDivElement;
  private groupWraps: HTMLDivElement[] = [];
  private groupButtons: HTMLButtonElement[] = [];
  /** Per group, the icon holder in its button and the tool it stands for (the last one used). */
  private groupIcons: HTMLSpanElement[] = [];
  private groupTools: DrawingToolType[] = [];
  private cursorBtn: HTMLButtonElement | null = null;
  private cursorWrap: HTMLDivElement | null = null;
  private cursorKind: CrosshairCursor = 'cross';
  private magnetBtn: HTMLButtonElement | null = null;
  private eraserBtn: HTMLButtonElement | null = null;
  private zoomBtn: HTMLButtonElement | null = null;
  private stayBtn: HTMLButtonElement | null = null;
  private lockAllBtn: HTMLButtonElement | null = null;
  private hideAllBtn: HTMLButtonElement | null = null;
  /** Every drawing locked, every drawing hidden: what those buttons undo next. */
  private drawings = { locked: false, hidden: false };
  private flyoutEl: HTMLDivElement | null = null;
  private flyoutIdx = -1;
  private flyoutHideTimer: ReturnType<typeof setTimeout> | null = null;
  private flyoutSwitchTimer: ReturnType<typeof setTimeout> | null = null;
  /** The open menu was opened from the keyboard: closing it gives the focus back to its button. */
  private flyoutByKey = false;
  /** Where hosts' own buttons go, after the drawing tools' switches. */
  private hostEl: HTMLDivElement | null = null;
  private favoritesEl: HTMLDivElement | null = null;
  private favoritesDivider: HTMLDivElement | null = null;
  private favorites: string[] = [];
  /** Narrow (a phone): the button over the chart that opens the sidebar, which then lies over the chart. */
  private fab: HTMLButtonElement;
  /** The tool the drawing button shows ('' for the pen). */
  private fabShows = '';
  /** Stops fitting the tools to a short column. */
  private readonly stopFit: () => void;
  private readonly onPressAway = (e: Event) => {
    const target = e.target as Node | null;
    if (target && (this.el.contains(target) || this.fab.contains(target) || this.flyoutEl?.contains(target))) return;
    this.setOpen(false);
  };
  private readonly onEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !this.flyoutEl) this.setOpen(false);
  };

  constructor(
    private readonly host: HTMLElement,
    config: SidebarConfig,
    callbacks: SidebarCallbacks,
    private readonly t: Translator = EN_TRANSLATOR,
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.el = document.createElement('div');
    this.el.className = 'tcw-sidebar';
    markPart(this.el, 'sidebar');
    this.build();
    // On a short screen the sidebar scrolls; a menu left open would point at the wrong button.
    this.el.addEventListener('scroll', () => this.hideFlyout(), { passive: true });
    host.appendChild(this.el);
    this.stopFit = watchToolFit(this.el);

    this.fab = document.createElement('button');
    this.fab.type = 'button';
    this.fab.className = 'tcw-sidebar-fab';
    this.fab.setAttribute('aria-label', this.t('drawing.tools'));
    this.fab.setAttribute('aria-expanded', 'false');
    this.fab.innerHTML = createIcon('penLine', 18);
    markPart(this.fab, 'sidebar');
    this.fab.addEventListener('click', () => this.setOpen(!this.isOpen()));
    host.appendChild(this.fab);
  }

  /**
   * Where the chart's plot starts, from the widget body's left edge (px): the
   * phone's drawing button sits in from there, off a left price scale, and in
   * a right-to-left widget off the price axis on the chart's right.
   */
  setPlotLeft(px: number): void {
    const value = `${Math.max(0, Math.round(px))}px`;
    if (this.fab.style.getPropertyValue(FAB_PLOT_LEFT) !== value) this.fab.style.setProperty(FAB_PLOT_LEFT, value);
  }

  /** Laid out as on a phone: the sidebar hides behind the drawing button. */
  private isNarrow(): boolean {
    return this.el.closest('[data-tcw-narrow]') !== null;
  }

  private isOpen(): boolean {
    return this.el.classList.contains('tcw-sidebar-open');
  }

  /** Narrow: show or hide the sidebar over the chart. */
  private setOpen(open: boolean): void {
    if (open === this.isOpen()) return;
    this.el.classList.toggle('tcw-sidebar-open', open);
    this.fab.setAttribute('aria-expanded', String(open));
    if (open) {
      document.addEventListener('pointerdown', this.onPressAway, true);
      document.addEventListener('keydown', this.onEscape);
    } else {
      // Focus in the sidebar going out of sight goes back to the button that opened it.
      const hadFocus = this.el.contains(document.activeElement) || !!this.flyoutEl?.contains(document.activeElement);
      this.hideFlyout();
      document.removeEventListener('pointerdown', this.onPressAway, true);
      document.removeEventListener('keydown', this.onEscape);
      if (hadFocus && this.isNarrow()) this.fab.focus({ preventScroll: true });
    }
  }

  /** Close the sidebar laid over the chart (the widget grew out of narrow). */
  closeOverlay(): void {
    this.setOpen(false);
  }

  /** Narrow, a tool picked (or a mode for the chart) closes the sidebar: the chart is where it is used. */
  private closeForChart(): void {
    if (this.isNarrow()) this.setOpen(false);
  }

  private pick(tool: DrawingToolType): void {
    this.callbacks.onDrawingTool(tool);
    this.closeForChart();
  }

  private build(): void {
    const { config, callbacks, el } = this;

    this.buildCursorButton();

    el.appendChild(this.divider());

    // Favorites strip (pinned tools) — only when favorites are enabled.
    if (callbacks.onToggleFavorite) {
      this.favorites = [...(config.favorites ?? [])];
      this.favoritesEl = document.createElement('div');
      this.favoritesEl.className = 'tcw-sidebar-favorites';
      markPart(this.favoritesEl, 'sidebar.favorites');
      el.appendChild(this.favoritesEl);
      this.favoritesDivider = this.divider();
      markPart(this.favoritesDivider, 'sidebar.favorites');
      el.appendChild(this.favoritesDivider);
      this.renderFavorites();
    }

    // Tool groups, a divider between one section and the next.
    let lastSection: string | undefined;
    config.drawingToolGroups.forEach((group, idx) => {
      if (!group.tools[0]) return;
      if (group.section !== undefined && lastSection !== undefined && group.section !== lastSection) {
        this.appendDivider();
      }
      lastSection = group.section;
      const wrap = document.createElement('div');
      wrap.className = 'tcw-tool-group-wrap';
      const feature = sectionFeature(group.section);
      if (feature) markPart(wrap, feature);

      const btn = document.createElement('button');
      btn.className = 'tcw-sidebar-btn';
      // The group shows, and picks, its last used tool — the first until then.
      const tool = group.tools[0].value;
      // A group with a menu names itself in the menu's header: no tooltip on top of it.
      if (group.tools.length > 1) btn.setAttribute('aria-label', `${group.label}: ${group.tools[0].label}`);
      else btn.title = group.label;
      const icon = document.createElement('span');
      icon.className = 'tcw-sidebar-icon';
      icon.innerHTML = createToolIcon(tool, TOOL_ICON_PX);
      btn.appendChild(icon);
      this.groupIcons.push(icon);
      this.groupTools.push(tool);

      if (group.tools.length > 1) {
        const dot = document.createElement('span');
        dot.className = 'tcw-multi-dot';
        btn.appendChild(dot);
      }

      btn.addEventListener('click', () => {
        // Narrow there is no hover: a tap on a group opens its menu.
        if (this.isNarrow() && group.tools.length > 1) {
          if (this.flyoutEl && this.flyoutIdx === idx) this.hideFlyout();
          else this.showFlyout(idx);
          return;
        }
        this.pick(this.groupTools[idx]);
      });
      wrap.appendChild(btn);

      // Flyout events via JS (not CSS hover). From the keyboard, the arrow
      // keys open a group's menu and go into it.
      wrap.addEventListener('mouseenter', () => { if (!this.isNarrow()) this.aimFlyout(idx, () => this.showFlyout(idx)); });
      wrap.addEventListener('mouseleave', () => {
        if (this.isNarrow()) return;
        this.cancelFlyoutSwitch();
        this.scheduleHideFlyout();
      });
      if (group.tools.length > 1) {
        btn.setAttribute('aria-haspopup', 'menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            this.showFlyout(idx);
            this.flyoutByKey = true;
            this.focusFlyoutItem(0);
          } else if (e.key === 'Escape' && this.flyoutEl) {
            e.stopPropagation();
            this.hideFlyout();
          }
        });
      }
      wrap.addEventListener('focusout', (e) => {
        const to = e.relatedTarget as Node | null;
        if (!wrap.contains(to) && !this.flyoutEl?.contains(to)) this.scheduleHideFlyout();
      });

      el.appendChild(wrap);
      this.groupWraps.push(wrap);
      this.groupButtons.push(btn);
    });

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'tcw-sidebar-spacer';
    el.appendChild(spacer);

    el.appendChild(this.divider());

    // Bottom tools
    if (callbacks.onToggleStyle) {
      const styleBtn = document.createElement('button');
      styleBtn.className = 'tcw-sidebar-btn';
      styleBtn.title = this.t('drawing.style');
      styleBtn.dataset.role = 'style';
      markPart(styleBtn, 'sidebar.style');
      styleBtn.innerHTML = createIcon('palette', 14);
      const onToggleStyle = callbacks.onToggleStyle;
      styleBtn.addEventListener('click', () => {
        onToggleStyle();
        this.closeForChart();
      });
      el.appendChild(styleBtn);
    }

    if (callbacks.onToggleMagnet) {
      this.magnetBtn = document.createElement('button');
      this.magnetBtn.className = 'tcw-sidebar-btn';
      this.magnetBtn.title = this.t('drawing.magnet');
      this.magnetBtn.innerHTML = createIcon('magnet', 14);
      this.magnetBtn.addEventListener('click', callbacks.onToggleMagnet);
      markPart(this.magnetBtn, 'sidebar.magnet');
      el.appendChild(this.magnetBtn);
    }

    if (callbacks.onToggleEraser) {
      const onToggleEraser = callbacks.onToggleEraser;
      this.eraserBtn = this.toggleButton('eraser', this.t('drawing.eraser'), () => {
        onToggleEraser();
        this.closeForChart();
      });
      markPart(this.eraserBtn, 'sidebar.eraser');
      el.appendChild(this.eraserBtn);
    }

    if (callbacks.onToggleZoomArea) {
      const onToggleZoomArea = callbacks.onToggleZoomArea;
      this.zoomBtn = this.toggleButton('zoomIn', this.t('drawing.zoomArea'), () => {
        onToggleZoomArea();
        this.closeForChart();
      });
      markPart(this.zoomBtn, 'sidebar.zoomArea');
      el.appendChild(this.zoomBtn);
    }

    if (callbacks.onToggleStayInDrawing) {
      this.stayBtn = document.createElement('button');
      this.stayBtn.className = 'tcw-sidebar-btn';
      this.stayBtn.dataset.role = 'stay';
      this.stayBtn.title = this.t('drawing.stay');
      this.stayBtn.setAttribute('aria-pressed', 'false');
      this.stayBtn.innerHTML = createIcon('repeat', 14);
      this.stayBtn.addEventListener('click', callbacks.onToggleStayInDrawing);
      markPart(this.stayBtn, 'sidebar.stayInDrawing');
      el.appendChild(this.stayBtn);
    }

    this.hostEl = document.createElement('div');
    this.hostEl.className = 'tcw-sidebar-host';
    el.appendChild(this.hostEl);

    // Every drawing at once: lock, hide, then the one that removes them, apart.
    // (Undo and redo are on the toolbar.)
    this.appendDivider();
    if (callbacks.onLockAll) {
      const onLockAll = callbacks.onLockAll;
      this.lockAllBtn = this.toggleButton('lock', this.t('drawing.lockAll'), () => onLockAll(!this.drawings.locked));
      this.lockAllBtn.dataset.role = 'lockAll';
      markPart(this.lockAllBtn, 'sidebar.lockAll');
      el.appendChild(this.lockAllBtn);
    }
    if (callbacks.onHideAll) {
      const onHideAll = callbacks.onHideAll;
      this.hideAllBtn = this.toggleButton('eyeOff', this.t('drawing.hideAll'), () => onHideAll(!this.drawings.hidden));
      this.hideAllBtn.dataset.role = 'hideAll';
      markPart(this.hideAllBtn, 'sidebar.hideAll');
      el.appendChild(this.hideAllBtn);
    }
    const clearBtn = document.createElement('button');
    clearBtn.className = 'tcw-sidebar-btn tcw-danger';
    clearBtn.title = this.t('drawing.clearAll');
    clearBtn.innerHTML = createIcon('trash', 14);
    clearBtn.setAttribute('aria-haspopup', 'menu');
    clearBtn.setAttribute('aria-expanded', 'false');
    clearBtn.addEventListener('click', () => callbacks.onClear(clearBtn));
    markPart(clearBtn, 'sidebar.clear');
    el.appendChild(clearBtn);
  }

  /** Whether every drawing is locked and every one hidden: the buttons say so, and undo it next. */
  setDrawingsState(state: { locked: boolean; hidden: boolean }): void {
    if (state.locked === this.drawings.locked && state.hidden === this.drawings.hidden) return;
    this.drawings = { ...state };
    // One name each, pressed while on: pressed again, it undoes it.
    for (const [btn, on] of [[this.lockAllBtn, state.locked], [this.hideAllBtn, state.hidden]] as const) {
      btn?.setAttribute('aria-pressed', String(on));
      btn?.classList.toggle('tcw-active', on);
    }
  }

  /** Update the pinned-tools strip. */
  setFavorites(favorites: string[]): void {
    this.favorites = [...favorites];
    this.renderFavorites();
    // A tool menu open now shows the stars as they are.
    for (const row of this.flyoutEl?.querySelectorAll<HTMLElement>('.tcw-flyout-row') ?? []) {
      const pinned = this.favorites.includes(row.dataset.toolValue ?? '');
      row.classList.toggle('tcw-flyout-faved', pinned);
      row.querySelector('[data-pin]')?.setAttribute('aria-pressed', String(pinned));
    }
  }

  private renderFavorites(): void {
    if (!this.favoritesEl) return;
    this.favoritesEl.replaceChildren();
    const visible = this.favorites.length > 0;
    this.favoritesEl.style.display = visible ? '' : 'none';
    if (this.favoritesDivider) this.favoritesDivider.style.display = visible ? '' : 'none';

    for (const tool of this.favorites) {
      const btn = document.createElement('button');
      btn.className = 'tcw-sidebar-btn';
      btn.title = fill(this.t('sidebar.unpinHint'), { tool: toolLabel(this.config.drawingToolGroups, tool) });
      btn.dataset.toolValue = tool;
      btn.innerHTML = createToolIcon(tool, TOOL_ICON_PX);
      btn.addEventListener('click', () => this.pick(tool as DrawingToolType));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.callbacks.onToggleFavorite?.(tool as never);
      });
      this.favoritesEl.appendChild(btn);
    }
  }

  /**
   * The cursor button: back to the cursor from a drawing tool, and, when the
   * host lets the kind change, a menu of the kinds (the cross, the dot, the
   * arrow), opened as a drawing group's is.
   */
  private buildCursorButton(): void {
    const { callbacks } = this;
    const wrap = document.createElement('div');
    wrap.className = 'tcw-cursor-wrap';
    const btn = document.createElement('button');
    btn.className = 'tcw-sidebar-btn';
    btn.addEventListener('click', () => {
      // Narrow there is no hover: a tap opens the menu, whose kinds go back to the cursor too.
      if (this.isNarrow() && callbacks.onCrosshairCursor) {
        if (this.flyoutEl && this.flyoutIdx === CURSOR_MENU) this.hideFlyout();
        else this.showCursorFlyout();
        return;
      }
      callbacks.onCancelDrawing();
      this.closeForChart();
    });
    markPart(wrap, 'sidebar.cursor');
    wrap.appendChild(btn);
    this.cursorBtn = btn;
    this.cursorWrap = wrap;
    this.showCrosshairCursor(this.cursorKind);
    if (callbacks.onCrosshairCursor) {
      btn.setAttribute('aria-haspopup', 'menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.flyoutEl) {
          e.stopPropagation();
          this.hideFlyout();
          return;
        }
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        this.showCursorFlyout();
        this.flyoutByKey = true;
        this.focusFlyoutItem(0);
      });
      wrap.addEventListener('mouseenter', () => { if (!this.isNarrow()) this.aimFlyout(CURSOR_MENU, () => this.showCursorFlyout()); });
      wrap.addEventListener('mouseleave', () => {
        if (this.isNarrow()) return;
        this.cancelFlyoutSwitch();
        this.scheduleHideFlyout();
      });
      wrap.addEventListener('focusout', (e) => {
        const to = e.relatedTarget as Node | null;
        if (!wrap.contains(to) && !this.flyoutEl?.contains(to)) this.scheduleHideFlyout();
      });
    }
    this.el.appendChild(wrap);
  }

  /** The cursor kind in use, shown on the cursor button and ticked in its menu. */
  showCrosshairCursor(kind: CrosshairCursor): void {
    this.cursorKind = kind;
    const btn = this.cursorBtn;
    if (!btn) return;
    const entry = CURSOR_KINDS.find((k) => k.kind === kind) ?? CURSOR_KINDS[0];
    btn.innerHTML = createIcon(entry.icon, 14);
    if (this.callbacks.onCrosshairCursor) {
      // A button with a menu names the kind it shows; its menu has the rest.
      btn.removeAttribute('title');
      btn.setAttribute('aria-label', `${this.t('drawing.cursor')}: ${this.t(entry.label)}`);
    } else {
      btn.title = this.t('drawing.cursor');
    }
    this.flyoutEl?.querySelectorAll<HTMLElement>('[data-cursor]').forEach((item) => {
      const on = item.dataset.cursor === kind;
      item.setAttribute('aria-checked', String(on));
      item.classList.toggle('tcw-active', on);
    });
  }

  private showCursorFlyout(): void {
    this.cancelHideFlyout();
    if (this.flyoutEl && this.flyoutIdx === CURSOR_MENU) return;
    this.hideFlyout();
    const flyout = document.createElement('div');
    flyout.className = 'tcw-flyout';
    flyout.setAttribute('role', 'menu');
    flyout.setAttribute('aria-label', this.t('drawing.cursors'));
    flyout.addEventListener('keydown', (e) => this.onFlyoutKey(e, CURSOR_MENU));
    const heading = document.createElement('div');
    heading.className = 'tcw-flyout-heading';
    heading.setAttribute('role', 'presentation');
    heading.textContent = this.t('drawing.cursors');
    flyout.appendChild(heading);
    for (const entry of CURSOR_KINDS) {
      const row = document.createElement('div');
      row.className = 'tcw-flyout-row';
      row.setAttribute('role', 'none');
      const item = document.createElement('button');
      item.className = 'tcw-flyout-item';
      item.setAttribute('role', 'menuitemradio');
      item.tabIndex = -1;
      item.dataset.cursor = entry.kind;
      item.innerHTML = createIcon(entry.icon, TOOL_ICON_PX);
      const name = document.createElement('span');
      name.className = 'tcw-flyout-name';
      name.textContent = this.t(entry.label);
      item.appendChild(name);
      item.addEventListener('click', () => {
        this.hideFlyout();
        this.callbacks.onCancelDrawing();
        this.callbacks.onCrosshairCursor?.(entry.kind);
        this.closeForChart();
      });
      row.appendChild(item);
      flyout.appendChild(row);
    }
    this.openFlyout(flyout, CURSOR_MENU);
    this.showCrosshairCursor(this.cursorKind);
  }

  /** A menu's button: the cursor button's, or a drawing group's. */
  private flyoutButton(idx: number): HTMLElement | null {
    return idx === CURSOR_MENU ? this.cursorBtn : this.groupButtons[idx] ?? null;
  }

  private flyoutWrap(idx: number): HTMLElement | null {
    return idx === CURSOR_MENU ? this.cursorWrap : this.groupWraps[idx] ?? null;
  }

  /**
   * Open a button's menu as the pointer comes over it: at once, unless
   * another's is open, which it then takes the place of a moment later, so a
   * pointer crossing this button on its way into that menu keeps it.
   */
  private aimFlyout(idx: number, open: () => void): void {
    this.cancelFlyoutSwitch();
    if (!this.flyoutEl || this.flyoutIdx === idx) {
      open();
      return;
    }
    this.flyoutSwitchTimer = setTimeout(() => {
      this.flyoutSwitchTimer = null;
      open();
    }, FLYOUT_SWITCH_DELAY_MS);
  }

  private cancelFlyoutSwitch(): void {
    if (this.flyoutSwitchTimer === null) return;
    clearTimeout(this.flyoutSwitchTimer);
    this.flyoutSwitchTimer = null;
  }

  /** Puts a built menu beside its button, open, and closes it as the pointer or the focus leaves. */
  private openFlyout(flyout: HTMLDivElement, idx: number): void {
    // The menu sits beside the sidebar, not in it, so the sidebar can scroll
    // without cutting it off.
    flyout.addEventListener('mouseenter', () => {
      this.cancelHideFlyout();
      this.cancelFlyoutSwitch();
    });
    flyout.addEventListener('mouseleave', () => this.scheduleHideFlyout());
    flyout.addEventListener('focusout', (e) => {
      const to = e.relatedTarget as Node | null;
      if (!flyout.contains(to) && !this.flyoutWrap(idx)?.contains(to)) this.scheduleHideFlyout();
    });
    this.flyoutEl = flyout;
    this.flyoutIdx = idx;
    this.flyoutByKey = false;
    this.host.appendChild(flyout);
    const button = this.flyoutButton(idx);
    if (button) this.placeFlyout(flyout, button);
    button?.setAttribute('aria-expanded', 'true');
  }

  private showFlyout(idx: number): void {
    this.cancelHideFlyout();
    if (this.flyoutEl && this.flyoutIdx === idx) return; // back before it closed: keep it
    const group = this.config.drawingToolGroups[idx];
    if (!group || group.tools.length <= 1) {
      this.hideFlyout();
      return;
    }

    this.hideFlyout();

    const flyout = document.createElement('div');
    flyout.className = 'tcw-flyout';
    flyout.setAttribute('role', 'menu');
    flyout.setAttribute('aria-label', group.label);
    flyout.addEventListener('keydown', (e) => this.onFlyoutKey(e, idx));

    // A menu of several kinds names each over its tools; a menu of one kind, the group over all.
    // Headed from its first tool on: a group whose first tools have none keeps its name over them.
    const headed = group.tools[0]?.heading !== undefined;
    if (!headed) {
      const header = document.createElement('div');
      header.className = 'tcw-flyout-header';
      header.textContent = group.label;
      flyout.appendChild(header);
    }

    const pinLabel = this.t('drawing.pinFavorite');
    for (const tool of group.tools) {
      if (tool.heading !== undefined) {
        const heading = document.createElement('div');
        heading.className = 'tcw-flyout-heading';
        // Read with the items it heads, not as one: the menu's arrows skip it.
        heading.setAttribute('role', 'presentation');
        heading.textContent = tool.heading;
        flyout.appendChild(heading);
      }
      // A row: the tool (its icon, name and shortcut), and a star beside it to pin it.
      const row = document.createElement('div');
      row.className = 'tcw-flyout-row';
      row.setAttribute('role', 'none');
      row.dataset.toolValue = tool.value;
      const item = document.createElement('button');
      item.className = 'tcw-flyout-item';
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      item.innerHTML = createToolIcon(tool.value, TOOL_ICON_PX);
      const name = document.createElement('span');
      name.className = 'tcw-flyout-name';
      name.textContent = tool.label;
      item.appendChild(name);
      const shortcut = this.config.shortcuts?.[tool.value];
      if (shortcut) {
        const key = document.createElement('kbd');
        key.className = 'tcw-flyout-key';
        key.textContent = shortcut;
        // Gone with the keys it names.
        markPart(key, 'hotkeys', 'hotkeys.tools');
        item.appendChild(key);
      }
      item.dataset.toolValue = tool.value;
      item.addEventListener('click', () => {
        this.hideFlyout();
        this.pick(tool.value);
      });
      row.appendChild(item);
      if (this.callbacks.onToggleFavorite) {
        const pinned = this.favorites.includes(tool.value);
        row.classList.toggle('tcw-flyout-faved', pinned);
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'tcw-flyout-pin';
        star.dataset.pin = tool.value;
        star.tabIndex = -1;
        star.title = pinLabel;
        star.setAttribute('aria-label', `${pinLabel}: ${tool.label}`);
        star.setAttribute('aria-pressed', String(pinned));
        star.innerHTML = createIcon('star', 12);
        star.addEventListener('click', (e) => {
          e.stopPropagation();
          this.callbacks.onToggleFavorite?.(tool.value);
        });
        row.appendChild(star);
        // From the keyboard, the menu key (or Shift+F10) on a tool pins it too.
        item.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.callbacks.onToggleFavorite?.(tool.value);
        });
      }
      flyout.appendChild(row);
    }

    this.openFlyout(flyout, idx);
  }

  private flyoutItems(): HTMLButtonElement[] {
    return this.flyoutEl ? [...this.flyoutEl.querySelectorAll<HTMLButtonElement>('.tcw-flyout-item')] : [];
  }

  private focusFlyoutItem(index: number): void {
    const items = this.flyoutItems();
    if (items.length === 0) return;
    items[(index + items.length) % items.length].focus();
  }

  /** Arrows, Home and End move through the menu; Escape or Left go back to its button; Tab leaves it. */
  private onFlyoutKey(e: KeyboardEvent, idx: number): void {
    const items = this.flyoutItems();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (e.key) {
      case 'ArrowDown': this.focusFlyoutItem(at + 1); break;
      case 'ArrowUp': this.focusFlyoutItem(at - 1); break;
      case 'Home': this.focusFlyoutItem(0); break;
      case 'End': this.focusFlyoutItem(items.length - 1); break;
      case 'Escape':
      case 'ArrowLeft':
        e.stopPropagation();
        this.hideFlyout();
        this.flyoutButton(idx)?.focus();
        break;
      case 'Tab':
        this.hideFlyout();
        this.flyoutButton(idx)?.focus();
        return; // the Tab itself moves on from the button
      default:
        return;
    }
    e.preventDefault();
  }

  /** Beside `button`, kept inside the host when it is taller than the room below. */
  private placeFlyout(flyout: HTMLElement, button: HTMLElement): void {
    const host = this.host.getBoundingClientRect();
    const at = button.getBoundingClientRect();
    // Its side from the column's edge, not the button's: the column is wider than its buttons.
    const column = this.el.getBoundingClientRect();
    // Taller than the chart, the menu scrolls.
    flyout.style.maxHeight = `${Math.max(0, this.host.clientHeight - FLYOUT_MARGIN * 2)}px`;
    const room = this.host.clientHeight - flyout.offsetHeight - FLYOUT_MARGIN;
    // Beside the column, toward the chart: its right, or its left in a right-to-left widget.
    if (this.host.closest('[dir]')?.getAttribute('dir') === 'rtl') {
      flyout.style.left = '';
      flyout.style.right = `${host.right - column.left}px`;
    } else {
      flyout.style.right = '';
      flyout.style.left = `${column.right - host.left}px`;
    }
    flyout.style.top = `${Math.max(0, Math.min(at.top - host.top, room))}px`;
  }

  /**
   * Close a moment after the pointer leaves, so one that slips off the menu
   * on its way to an item (a diagonal move) doesn't lose it.
   */
  private scheduleHideFlyout(): void {
    this.cancelHideFlyout();
    this.flyoutHideTimer = setTimeout(() => {
      this.flyoutHideTimer = null;
      this.hideFlyout();
    }, FLYOUT_CLOSE_DELAY_MS);
  }

  private cancelHideFlyout(): void {
    if (this.flyoutHideTimer === null) return;
    clearTimeout(this.flyoutHideTimer);
    this.flyoutHideTimer = null;
  }

  private hideFlyout(): void {
    this.cancelHideFlyout();
    this.cancelFlyoutSwitch();
    const button = this.flyoutButton(this.flyoutIdx);
    // Opened from the keyboard, the focus goes back to its button rather than to nowhere.
    const refocus = this.flyoutByKey && this.flyoutEl?.contains(document.activeElement) === true;
    if (this.flyoutEl) {
      this.flyoutEl.remove();
      this.flyoutEl = null;
    }
    button?.setAttribute('aria-expanded', 'false');
    this.flyoutIdx = -1;
    this.flyoutByKey = false;
    if (refocus) button?.focus();
  }

  update(state: WidgetState): void {
    // Cursor active
    if (this.cursorBtn) {
      this.cursorBtn.classList.toggle('tcw-active', state.activeTool === null);
    }

    // The drawing button shows the tool picked (or a pen), lit while one is.
    const shows = state.activeTool ?? '';
    if (shows !== this.fabShows) {
      this.fabShows = shows;
      this.fab.innerHTML = state.activeTool ? createToolIcon(state.activeTool, 18) : createIcon('penLine', 18);
    }
    this.fab.classList.toggle('tcw-active', state.activeTool !== null || state.eraser || state.zoomArea);

    // Group buttons: the active group lights up and takes on the picked tool's icon.
    const { drawingToolGroups } = this.config;
    for (let i = 0; i < drawingToolGroups.length; i++) {
      const isActive = drawingToolGroups[i].tools.some(t => t.value === state.activeTool);
      this.groupButtons[i].classList.toggle('tcw-active', isActive);
      if (isActive && state.activeTool && state.activeTool !== this.groupTools[i]) {
        this.groupTools[i] = state.activeTool;
        this.groupIcons[i].innerHTML = createToolIcon(state.activeTool, TOOL_ICON_PX);
        if (drawingToolGroups[i].tools.length > 1) {
          this.groupButtons[i].setAttribute('aria-label', `${drawingToolGroups[i].label}: ${toolLabel(drawingToolGroups, state.activeTool)}`);
        }
      }
    }

    // Flyout items
    if (this.flyoutEl) {
      this.flyoutEl.querySelectorAll('.tcw-flyout-item').forEach((item) => {
        const el = item as HTMLElement;
        // The cursor menu ticks the kind in use instead (`showCrosshairCursor`).
        if (el.dataset.cursor) return;
        el.classList.toggle('tcw-active', el.dataset.toolValue === state.activeTool);
      });
    }

    // Magnet: off, weak or strong.
    if (this.magnetBtn) {
      const strong = state.magnetEnabled && state.magnetStrong;
      this.magnetBtn.classList.toggle('tcw-active', state.magnetEnabled);
      this.magnetBtn.innerHTML = createIcon(strong ? 'magnetStrong' : 'magnet', 14);
      this.magnetBtn.title = strong ? this.t('drawing.magnetStrong') : state.magnetEnabled ? this.t('drawing.magnetOn') : this.t('drawing.magnetOff');
      this.magnetBtn.setAttribute('aria-label', this.magnetBtn.title);
    }

    for (const [btn, on] of [[this.eraserBtn, state.eraser], [this.zoomBtn, state.zoomArea]] as const) {
      if (!btn) continue;
      btn.classList.toggle('tcw-active', on);
      btn.setAttribute('aria-pressed', String(on));
    }

    if (this.stayBtn) {
      this.stayBtn.classList.toggle('tcw-active', state.stayInDrawing);
      this.stayBtn.setAttribute('aria-pressed', String(state.stayInDrawing));
    }
  }

  /** A host's own button, after the drawing tools' switches. */
  addHostButton(spec: SidebarButtonSpec): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tcw-sidebar-btn tcw-host-btn';
    btn.dataset.hostButton = spec.id;
    btn.title = spec.label;
    btn.setAttribute('aria-label', spec.label);
    if (spec.toggle) btn.setAttribute('aria-pressed', 'false');
    if (typeof spec.icon === 'string') btn.innerHTML = createIcon(spec.icon, 14);
    else btn.appendChild(spec.icon);
    btn.addEventListener('click', () => spec.onClick(btn));
    this.hostEl?.appendChild(btn);
    this.tidy();
    return btn;
  }

  /** The holder of hosts' own buttons and anything else of theirs. */
  hostSlot(): HTMLDivElement | null {
    return this.hostEl;
  }

  /** No divider left at an end or next to another once buttons are switched off. */
  tidy(): void {
    tidyDividers(this.el, 'tcw-sidebar-divider', 'tcw-sidebar-spacer');
  }

  /** A sidebar button that is on or off (aria-pressed). */
  private toggleButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'tcw-sidebar-btn';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = createIcon(icon, 14);
    btn.addEventListener('click', onClick);
    return btn;
  }

  /** A divider, unless the sidebar already ends in one: never two in a row. */
  private appendDivider(): void {
    if (this.el.lastElementChild?.classList.contains('tcw-sidebar-divider')) return;
    this.el.appendChild(this.divider());
  }

  private divider(): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'tcw-sidebar-divider';
    return d;
  }

  destroy(): void {
    this.stopFit();
    this.setOpen(false);
    this.hideFlyout();
    this.fab.remove();
    this.el.remove();
  }
}
