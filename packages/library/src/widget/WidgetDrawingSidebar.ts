import type { DrawingToolType } from '@tradecanvas/commons';
import type { SidebarConfig, SidebarCallbacks, WidgetState } from './types.js';
import { createIcon, createToolIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';

/** Drawing tool icons carry more detail than interface glyphs: a size up. */
const TOOL_ICON_PX = 16;

/** How long a tool menu stays after the pointer leaves it. */
const FLYOUT_CLOSE_DELAY_MS = 150;
/** Room kept between a tool menu and the bottom of the chart (px). */
const FLYOUT_MARGIN = 4;

/** Human label for a tool id, sourced from the configured groups. */
function toolLabel(groups: SidebarConfig['drawingToolGroups'], tool: string): string {
  for (const g of groups) {
    const t = g.tools.find((x) => x.value === tool);
    if (t) return t.label;
  }
  return tool;
}

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
  private magnetBtn: HTMLButtonElement | null = null;
  private eraserBtn: HTMLButtonElement | null = null;
  private zoomBtn: HTMLButtonElement | null = null;
  private stayBtn: HTMLButtonElement | null = null;
  private flyoutEl: HTMLDivElement | null = null;
  private flyoutIdx = -1;
  private flyoutHideTimer: ReturnType<typeof setTimeout> | null = null;
  private favoritesEl: HTMLDivElement | null = null;
  private favoritesDivider: HTMLDivElement | null = null;
  private favorites: string[] = [];

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
    this.build();
    // On a short screen the sidebar scrolls; a menu left open would point at the wrong button.
    this.el.addEventListener('scroll', () => this.hideFlyout(), { passive: true });
    host.appendChild(this.el);
  }

  private build(): void {
    const { config, callbacks, el } = this;

    // Cursor button
    this.cursorBtn = document.createElement('button');
    this.cursorBtn.className = 'tcw-sidebar-btn';
    this.cursorBtn.title = this.t('drawing.cursor');
    this.cursorBtn.innerHTML = createIcon('cursor', 14);
    this.cursorBtn.addEventListener('click', callbacks.onCancelDrawing);
    el.appendChild(this.cursorBtn);

    el.appendChild(this.divider());

    // Favorites strip (pinned tools) — only when favorites are enabled.
    if (callbacks.onToggleFavorite) {
      this.favorites = [...(config.favorites ?? [])];
      this.favoritesEl = document.createElement('div');
      this.favoritesEl.className = 'tcw-sidebar-favorites';
      el.appendChild(this.favoritesEl);
      this.favoritesDivider = this.divider();
      el.appendChild(this.favoritesDivider);
      this.renderFavorites();
    }

    // Tool groups
    config.drawingToolGroups.forEach((group, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'tcw-tool-group-wrap';

      const btn = document.createElement('button');
      btn.className = 'tcw-sidebar-btn';
      // The group shows, and picks, its last used tool — the first until then.
      const tool = group.tools[0]?.value;
      if (!tool) return;
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

      btn.addEventListener('click', () => callbacks.onDrawingTool(this.groupTools[idx]));
      wrap.appendChild(btn);

      // Flyout events via JS (not CSS hover). From the keyboard, the arrow
      // keys open a group's menu and go into it.
      wrap.addEventListener('mouseenter', () => this.showFlyout(idx));
      wrap.addEventListener('mouseleave', () => this.scheduleHideFlyout());
      if (group.tools.length > 1) {
        btn.setAttribute('aria-haspopup', 'menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            this.showFlyout(idx);
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
      styleBtn.innerHTML = createIcon('palette', 14);
      styleBtn.addEventListener('click', callbacks.onToggleStyle);
      el.appendChild(styleBtn);
    }

    if (callbacks.onToggleMagnet) {
      this.magnetBtn = document.createElement('button');
      this.magnetBtn.className = 'tcw-sidebar-btn';
      this.magnetBtn.title = this.t('drawing.magnet');
      this.magnetBtn.innerHTML = createIcon('magnet', 14);
      this.magnetBtn.addEventListener('click', callbacks.onToggleMagnet);
      el.appendChild(this.magnetBtn);
    }

    if (callbacks.onToggleEraser) {
      this.eraserBtn = this.toggleButton('eraser', this.t('drawing.eraser'), callbacks.onToggleEraser);
      el.appendChild(this.eraserBtn);
    }

    if (callbacks.onToggleZoomArea) {
      this.zoomBtn = this.toggleButton('zoomIn', this.t('drawing.zoomArea'), callbacks.onToggleZoomArea);
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
      el.appendChild(this.stayBtn);
    }

    const undoBtn = document.createElement('button');
    undoBtn.className = 'tcw-sidebar-btn';
    undoBtn.title = this.t('drawing.undo');
    undoBtn.innerHTML = createIcon('undo', 14);
    undoBtn.addEventListener('click', callbacks.onUndo);
    el.appendChild(undoBtn);

    const redoBtn = document.createElement('button');
    redoBtn.className = 'tcw-sidebar-btn';
    redoBtn.title = this.t('drawing.redo');
    redoBtn.innerHTML = createIcon('redo', 14);
    redoBtn.addEventListener('click', callbacks.onRedo);
    el.appendChild(redoBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'tcw-sidebar-btn tcw-danger';
    clearBtn.title = this.t('drawing.clearAll');
    clearBtn.innerHTML = createIcon('trash', 14);
    clearBtn.addEventListener('click', callbacks.onClearDrawings);
    el.appendChild(clearBtn);
  }

  /** Update the pinned-tools strip. */
  setFavorites(favorites: string[]): void {
    this.favorites = [...favorites];
    this.renderFavorites();
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
      btn.addEventListener('click', () => this.callbacks.onDrawingTool(tool as never));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.callbacks.onToggleFavorite?.(tool as never);
      });
      this.favoritesEl.appendChild(btn);
    }
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

    const header = document.createElement('div');
    header.className = 'tcw-flyout-header';
    header.textContent = group.label;
    flyout.appendChild(header);

    for (const tool of group.tools) {
      const item = document.createElement('button');
      item.className = 'tcw-flyout-item';
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      item.innerHTML = createToolIcon(tool.value, TOOL_ICON_PX);
      const name = document.createElement('span');
      name.textContent = tool.label;
      item.appendChild(name);
      item.dataset.toolValue = tool.value;
      item.addEventListener('click', () => {
        this.callbacks.onDrawingTool(tool.value);
        this.hideFlyout();
      });
      if (this.callbacks.onToggleFavorite) {
        if (this.favorites.includes(tool.value)) item.classList.add('tcw-flyout-faved');
        item.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.callbacks.onToggleFavorite?.(tool.value);
        });
      }
      flyout.appendChild(item);
    }
    if (this.callbacks.onToggleFavorite) {
      // Said once for the menu rather than as a tooltip on every row.
      const hint = document.createElement('div');
      hint.className = 'tcw-flyout-hint';
      hint.textContent = this.t('drawing.pinHint');
      flyout.appendChild(hint);
    }

    // The menu sits beside the sidebar, not in it, so the sidebar can scroll
    // without cutting it off.
    flyout.addEventListener('mouseenter', () => this.cancelHideFlyout());
    flyout.addEventListener('mouseleave', () => this.scheduleHideFlyout());
    flyout.addEventListener('focusout', (e) => {
      const to = e.relatedTarget as Node | null;
      if (!flyout.contains(to) && !this.groupWraps[idx].contains(to)) this.scheduleHideFlyout();
    });
    this.flyoutEl = flyout;
    this.flyoutIdx = idx;
    this.host.appendChild(flyout);
    this.placeFlyout(flyout, this.groupButtons[idx]);
    this.groupButtons[idx].setAttribute('aria-expanded', 'true');
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
        this.groupButtons[idx]?.focus();
        break;
      case 'Tab':
        this.hideFlyout();
        this.groupButtons[idx]?.focus();
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
    // Taller than the chart, the menu scrolls.
    flyout.style.maxHeight = `${Math.max(0, this.host.clientHeight - FLYOUT_MARGIN * 2)}px`;
    const room = this.host.clientHeight - flyout.offsetHeight - FLYOUT_MARGIN;
    // Beside the button, toward the chart: its right, or its left in a right-to-left widget.
    if (this.host.closest('[dir]')?.getAttribute('dir') === 'rtl') {
      flyout.style.left = '';
      flyout.style.right = `${host.right - at.left}px`;
    } else {
      flyout.style.right = '';
      flyout.style.left = `${at.right - host.left}px`;
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
    if (this.flyoutEl) {
      this.flyoutEl.remove();
      this.flyoutEl = null;
    }
    this.groupButtons[this.flyoutIdx]?.setAttribute('aria-expanded', 'false');
    this.flyoutIdx = -1;
  }

  update(state: WidgetState): void {
    // Cursor active
    if (this.cursorBtn) {
      this.cursorBtn.classList.toggle('tcw-active', state.activeTool === null);
    }

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

  private divider(): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'tcw-sidebar-divider';
    return d;
  }

  destroy(): void {
    this.hideFlyout();
    this.el.remove();
  }
}
