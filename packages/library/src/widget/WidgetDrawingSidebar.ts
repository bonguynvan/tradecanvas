import type { SidebarConfig, SidebarCallbacks, WidgetState } from './types.js';
import { createIcon } from './icons.js';

const GROUP_ICONS = [
  'trendingUp', 'minus', 'penLine', 'hash', 'square', 'gitBranch', 'ruler', 'type',
];

export class WidgetDrawingSidebar {
  private config: SidebarConfig;
  private callbacks: SidebarCallbacks;
  private el: HTMLDivElement;
  private groupWraps: HTMLDivElement[] = [];
  private groupButtons: HTMLButtonElement[] = [];
  private cursorBtn: HTMLButtonElement | null = null;
  private magnetBtn: HTMLButtonElement | null = null;
  private flyoutEl: HTMLDivElement | null = null;

  constructor(host: HTMLElement, config: SidebarConfig, callbacks: SidebarCallbacks) {
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
    this.cursorBtn.title = 'Cursor';
    this.cursorBtn.innerHTML = createIcon('cursor', 14);
    this.cursorBtn.addEventListener('click', callbacks.onCancelDrawing);
    el.appendChild(this.cursorBtn);

    el.appendChild(this.divider());

    // Tool groups
    config.drawingToolGroups.forEach((group, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'tcw-tool-group-wrap';

      const btn = document.createElement('button');
      btn.className = 'tcw-sidebar-btn';
      btn.title = group.label;
      btn.innerHTML = createIcon(GROUP_ICONS[idx] ?? 'square', 14);

      if (group.tools.length > 1) {
        const dot = document.createElement('span');
        dot.className = 'tcw-multi-dot';
        btn.appendChild(dot);
      }

      btn.addEventListener('click', () => callbacks.onDrawingTool(group.tools[0].value));
      wrap.appendChild(btn);

      // Flyout events via JS (not CSS hover)
      wrap.addEventListener('mouseenter', () => this.showFlyout(idx));
      wrap.addEventListener('mouseleave', () => this.hideFlyout());

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
    this.magnetBtn = document.createElement('button');
    this.magnetBtn.className = 'tcw-sidebar-btn';
    this.magnetBtn.title = 'Magnet';
    this.magnetBtn.innerHTML = createIcon('magnet', 14);
    this.magnetBtn.addEventListener('click', callbacks.onToggleMagnet);
    el.appendChild(this.magnetBtn);

    const undoBtn = document.createElement('button');
    undoBtn.className = 'tcw-sidebar-btn';
    undoBtn.title = 'Undo';
    undoBtn.innerHTML = createIcon('undo', 14);
    undoBtn.addEventListener('click', callbacks.onUndo);
    el.appendChild(undoBtn);

    const redoBtn = document.createElement('button');
    redoBtn.className = 'tcw-sidebar-btn';
    redoBtn.title = 'Redo';
    redoBtn.innerHTML = createIcon('redo', 14);
    redoBtn.addEventListener('click', callbacks.onRedo);
    el.appendChild(redoBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'tcw-sidebar-btn tcw-danger';
    clearBtn.title = 'Clear all';
    clearBtn.innerHTML = createIcon('trash', 14);
    clearBtn.addEventListener('click', callbacks.onClearDrawings);
    el.appendChild(clearBtn);
  }

  private showFlyout(idx: number): void {
    const group = this.config.drawingToolGroups[idx];
    if (!group || group.tools.length <= 1) return;

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
      item.textContent = tool.label;
      item.dataset.toolValue = tool.value;
      item.addEventListener('click', () => {
        this.callbacks.onDrawingTool(tool.value);
        this.hideFlyout();
      });
      flyout.appendChild(item);
    }

    this.flyoutEl = flyout;
    this.groupWraps[idx].appendChild(flyout);
  }

  private hideFlyout(): void {
    if (this.flyoutEl) {
      this.flyoutEl.remove();
      this.flyoutEl = null;
    }
  }

  update(state: WidgetState): void {
    // Cursor active
    if (this.cursorBtn) {
      this.cursorBtn.classList.toggle('tcw-active', state.activeTool === null);
    }

    // Group buttons
    const { drawingToolGroups } = this.config;
    for (let i = 0; i < drawingToolGroups.length; i++) {
      const isActive = drawingToolGroups[i].tools.some(t => t.value === state.activeTool);
      this.groupButtons[i].classList.toggle('tcw-active', isActive);
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
      this.magnetBtn.title = state.magnetEnabled ? 'Magnet ON' : 'Magnet OFF';
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
