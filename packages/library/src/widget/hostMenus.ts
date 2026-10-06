import type { ContextMenuEntry } from './WidgetContextMenu.js';
import type { WidgetMenuItem } from './types.js';

/** Host entries' ids in a widget menu: this, then their index. */
const HOST_PREFIX = 'host:';

/** A menu's entries with a host's own after them, a separator between. */
export function withHostItems(entries: readonly ContextMenuEntry[], items: readonly WidgetMenuItem[]): ContextMenuEntry[] {
  return [
    ...entries,
    ...(entries.length > 0 && items.length > 0 ? ['separator' as const] : []),
    ...items.map((item, i) => ({ id: `${HOST_PREFIX}${i}`, label: item.label, icon: item.icon, danger: item.danger, checked: item.checked })),
  ];
}

/** Runs the host entry picked; `false` when the entry is the widget's own. */
export function pickHostItem(id: string, items: readonly WidgetMenuItem[]): boolean {
  if (!id.startsWith(HOST_PREFIX)) return false;
  items[Number(id.slice(HOST_PREFIX.length))]?.onSelect();
  return true;
}
