import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import { WidgetNamePrompt } from './WidgetNamePrompt.js';
import { WidgetLayoutsDialog } from './WidgetLayoutsDialog.js';
import { fill, type Translator } from './i18n.js';
import type { LayoutSession } from '../state/LayoutSession.js';
import type { SavedLayoutSummary } from '../state/layoutStorage.js';

/** Saved layouts listed in the layouts menu; the rest are in its "Open layout…" dialog. */
const RECENT_LAYOUTS = 5;

export interface LayoutsUIHost {
  /** Where the menu, the name prompt and the dialog live. */
  root: HTMLElement;
  t: Translator;
  toast: (message: string, kind?: 'info' | 'error') => void;
  formatTime: (ms: number) => string;
}

/**
 * The named-layouts controls over a {@link LayoutSession}: the menu under the
 * layouts button (save, save as, rename, auto-save, the latest layouts, open
 * another), the name prompt and the list of every layout. Failures are told
 * in a toast.
 */
export class WidgetLayoutsUI {
  private readonly menu: WidgetContextMenu;
  private readonly prompt: WidgetNamePrompt;
  private readonly dialog: WidgetLayoutsDialog;
  private destroyed = false;

  constructor(private readonly session: LayoutSession, private readonly host: LayoutsUIHost) {
    const { root, t } = host;
    this.menu = new WidgetContextMenu(root, t('toolbar.layouts'));
    this.prompt = new WidgetNamePrompt(root, t);
    this.dialog = new WidgetLayoutsDialog(root, {
      list: () => session.list(),
      currentId: () => session.current()?.id ?? null,
      onOpen: (id) => void this.open(id),
      onRename: (layout) => this.promptRename(layout),
      onDelete: async (id) => {
        try {
          await session.remove(id);
        } catch {
          this.host.toast(t('layouts.deleteFailed'), 'error');
        }
      },
      formatTime: host.formatTime,
    }, t);
  }

  /** Save into the open layout, or ask for a name when there is none. */
  async save(): Promise<void> {
    // Already asking for a name: that save is under way.
    if (this.prompt.isOpen()) return;
    if (!this.session.current()) {
      this.promptSaveAs();
      return;
    }
    const { t, toast } = this.host;
    try {
      const saved = await this.session.save();
      if (saved) toast(fill(t('layouts.saved'), { name: saved.name }));
    } catch {
      toast(t('layouts.saveFailed'), 'error');
    }
  }

  /** Open a saved layout by id; `false` (and a toast) when it could not be. */
  async open(id: string): Promise<boolean> {
    try {
      if (await this.session.open(id)) return true;
    } catch {
      // Told below.
    }
    if (!this.destroyed) this.host.toast(this.host.t('layouts.openFailed'), 'error');
    return false;
  }

  promptSaveAs(): void {
    const { t, toast } = this.host;
    const current = this.session.current();
    this.prompt.open({
      title: t('layouts.saveAsTitle'),
      value: current ? fill(t('layouts.copyName'), { name: current.name }) : '',
      submitLabel: t('common.save'),
      onSubmit: async (name) => {
        try {
          const saved = await this.session.saveAs(name);
          toast(fill(t('layouts.saved'), { name: saved.name }));
        } catch (err) {
          toast(t('layouts.saveFailed'), 'error');
          throw err;
        }
      },
    });
  }

  promptRename(layout: SavedLayoutSummary | null = this.session.current()): void {
    if (!layout) return;
    const { t, toast } = this.host;
    this.prompt.open({
      title: t('layouts.renameTitle'),
      value: layout.name,
      submitLabel: t('layouts.renameSubmit'),
      onSubmit: async (name) => {
        try {
          await this.session.rename(layout.id, name);
        } catch (err) {
          toast(t('layouts.saveFailed'), 'error');
          throw err;
        }
        if (this.dialog.isOpen()) void this.dialog.refresh();
      },
    });
  }

  /** Every layout, to open, rename or delete. */
  openDialog(): Promise<void> {
    return this.dialog.open();
  }

  /** The layouts menu under `anchor` (a second press closes it). */
  async openMenu(anchor: HTMLElement): Promise<void> {
    if (this.menu.isOpen()) {
      this.menu.close();
      return;
    }
    const { session } = this;
    const { t, root } = this.host;
    let recent: SavedLayoutSummary[] = [];
    try {
      recent = (await session.list()).slice(0, RECENT_LAYOUTS);
    } catch {
      // The menu still saves; the list shows what it can.
    }
    if (this.destroyed) return;
    const current = session.current();
    const entries: ContextMenuEntry[] = [
      { id: 'save', label: t('layouts.save'), icon: 'save' },
      { id: 'saveAs', label: t('layouts.saveAs'), icon: 'plus' },
    ];
    if (current) entries.push({ id: 'rename', label: t('layouts.rename'), icon: 'penLine' });
    entries.push({ id: 'autoSave', label: t('layouts.autoSave'), checked: session.isAutoSave() });
    if (recent.length > 0) {
      entries.push('separator', ...recent.map((l): ContextMenuEntry => ({ id: `open:${l.id}`, label: l.name, checked: l.id === current?.id })));
    }
    entries.push('separator', { id: 'manage', label: t('layouts.open'), icon: 'folder' });

    const at = anchor.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    this.menu.open(entries, at.left - box.left, at.bottom - box.top + 2, (id) => {
      if (id === 'save') void this.save();
      else if (id === 'saveAs') this.promptSaveAs();
      else if (id === 'rename') this.promptRename();
      else if (id === 'autoSave') session.setAutoSave(!session.isAutoSave());
      else if (id === 'manage') void this.openDialog();
      else if (id.startsWith('open:')) void this.open(id.slice('open:'.length));
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.menu.destroy();
    this.prompt.destroy();
    this.dialog.destroy();
  }
}
