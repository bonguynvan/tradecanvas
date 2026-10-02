import type { DrawingToolType } from '@tradecanvas/commons';
import type { SidebarConfig, SidebarCallbacks, WidgetState } from './types.js';
import { createIcon, createToolIcon } from './icons.js';
import { EN_TRANSLATOR, type Translator } from './i18n.js';

/** Drawing tool icons carry more detail than interface glyphs: a size up. */
const TOOL_ICON_PX = 16;

/** How long a tool menu stays after the pointer leaves it. */
const FLYOUT_CLOSE_DELAY_MS = 150;

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
  private stayBtn: HTMLButtonElement | null = null;
  private flyoutEl: HTMLDivElement | null = null;
  private flyoutIdx = -1;
  private flyoutHideTimer: ReturnType<typeof setTimeout> | null = null;
  private favoritesEl: HTMLDivElement | null = null;
  private favoritesDivider: HTMLDivElement | null = null;
  private favorites: string[] = [];

  constructor(host: HTMLElement, config: SidebarConfig, callbacks: SidebarCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.config = config;
    this.callbacks = callbacks;
    this.el = document.createElement('div');
    this.el.className = 'tcw-sidebar';
    this.build();
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

      // Flyout events via JS (not CSS hover); keyboard focus opens it too.
      wrap.addEventListener('mouseenter', () => this.showFlyout(idx));
      wrap.addEventListener('mouseleave', () => this.scheduleHideFlyout());
      btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) this.showFlyout(idx); });
      wrap.addEventListener('focusout', (e) => {
        if (!wrap.contains(e.relatedTarget as Node | null)) this.scheduleHideFlyout();
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
      btn.title = `${toolLabel(this.config.drawingToolGroups, tool)} (right-click to unpin)`;
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

    const header = document.createElement('div');
    header.className = 'tcw-flyout-header';
    header.textContent = group.label;
    flyout.appendChild(header);

    for (const tool of group.tools) {
      const item = document.createElement('button');
      item.className = 'tcw-flyout-item';
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

    this.flyoutEl = flyout;
    this.flyoutIdx = idx;
    this.groupWraps[idx].appendChild(flyout);
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

    // Magnet
    if (this.magnetBtn) {
      this.magnetBtn.classList.toggle('tcw-active', state.magnetEnabled);
      this.magnetBtn.title = state.magnetEnabled ? this.t('drawing.magnetOn') : this.t('drawing.magnetOff');
    }

    if (this.stayBtn) {
      this.stayBtn.classList.toggle('tcw-active', state.stayInDrawing);
      this.stayBtn.setAttribute('aria-pressed', String(state.stayInDrawing));
    }
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
