import type { ContextMenuEntry } from './WidgetContextMenu.js';
import type { Translator } from './i18n.js';

/** What a right-clicked drawing's menu can do. */
export type DrawingMenuAction =
  | 'settings' | 'alert'
  | 'front' | 'forward' | 'backward' | 'back'
  | 'group' | 'ungroup'
  | 'lock' | 'unlock' | 'hide' | 'duplicate' | 'delete';

/** The right-clicked drawing and the selection it is part of. */
export interface DrawingMenuTarget {
  /** Selected drawings: the right-clicked one, its group, or a selection it was part of. */
  selected: readonly { id: string; locked: boolean; groupId: string | null }[];
  canConfigure: boolean;
  canAlert: boolean;
}

/**
 * The menu's entries: settings and alert for one drawing, order, grouping,
 * then lock, hide, duplicate and delete for the whole selection.
 */
export function drawingMenuEntries(target: DrawingMenuTarget, t: Translator): ContextMenuEntry[] {
  const { selected } = target;
  const single = selected.length === 1;
  const groups = new Set(selected.map((d) => d.groupId));
  const oneGroup = groups.size === 1 && !groups.has(null);
  const entries: ContextMenuEntry[] = [];
  if (target.canConfigure && single) entries.push({ id: 'settings', label: t('drawingMenu.settings'), icon: 'settings' });
  if (target.canAlert && single) entries.push({ id: 'alert', label: t('drawingSettings.addAlert'), icon: 'bell' });
  if (entries.length > 0) entries.push('separator');
  if (single) {
    entries.push(
      { id: 'front', label: t('drawingMenu.front') },
      { id: 'forward', label: t('drawingMenu.forward') },
      { id: 'backward', label: t('drawingMenu.backward') },
      { id: 'back', label: t('drawingMenu.back') },
      'separator',
    );
  }
  if (selected.length > 1 && !oneGroup) entries.push({ id: 'group', label: t('drawingMenu.group'), icon: 'layers' });
  if (selected.some((d) => d.groupId)) entries.push({ id: 'ungroup', label: t('drawingMenu.ungroup'), icon: 'layers' });
  const locked = selected.every((d) => d.locked);
  entries.push(
    locked
      ? { id: 'unlock', label: t('common.unlock'), icon: 'unlock' }
      : { id: 'lock', label: t('common.lock'), icon: 'lock' },
    { id: 'hide', label: t('common.hide'), icon: 'eyeOff' },
  );
  if (single) entries.push({ id: 'duplicate', label: t('drawingMenu.duplicate'), icon: 'plus' });
  if (!locked) entries.push('separator', { id: 'delete', label: t('drawingMenu.delete'), icon: 'trash', danger: true });
  return entries;
}
