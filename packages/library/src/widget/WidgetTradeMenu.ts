import type { ToolbarCallbacks } from './types.js';
import { createIcon } from './icons.js';
import { escapeHtml as esc } from './escapeHtml.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import type { Translator } from './i18n.js';
import { markPart, type WidgetFeature } from './widgetFeatures.js';

type TradeId = 'ticket' | 'long' | 'short' | 'ladder' | 'account';

/** What the Trade menu offers: each with the switches that take it away. */
type TradeItem = { id: TradeId; label: string; parts: WidgetFeature[]; run: () => void };

/** The actions' icons; the panels show a tick while they are open instead. */
const ACTION_ICONS: Record<TradeId, string> = {
  ticket: 'receipt', long: 'trendingUp', short: 'trendingDown', ladder: 'ladder', account: 'layers',
};
const PANELS: readonly TradeId[] = ['ladder', 'account'];

function tradeItems(callbacks: ToolbarCallbacks, t: Translator): TradeItem[] {
  const items: TradeItem[] = [];
  if (callbacks.onOrderTicket) items.push({ id: 'ticket', label: t('chartMenu.orderTicket'), parts: ['orderTicket'], run: callbacks.onOrderTicket });
  const onBracket = callbacks.onBracket;
  if (onBracket) {
    items.push({ id: 'long', label: t('toolbar.longBracket'), parts: ['bracketOrders', 'toolbar.bracketOrders'], run: () => onBracket('buy') });
    items.push({ id: 'short', label: t('toolbar.shortBracket'), parts: ['bracketOrders', 'toolbar.bracketOrders'], run: () => onBracket('sell') });
  }
  if (callbacks.onToggleLadder) items.push({ id: 'ladder', label: t('toolbar.depthLadder'), parts: ['depthLadder', 'toolbar.depthLadder'], run: callbacks.onToggleLadder });
  if (callbacks.onToggleAccount) items.push({ id: 'account', label: t('toolbar.account'), parts: ['accountPanel', 'toolbar.accountPanel'], run: callbacks.onToggleAccount });
  return items;
}

/**
 * The toolbar's Trade menu: a new order, the brackets, the depth ladder and
 * the account panel, in one button. Each item goes with its own switches,
 * and the button with them all.
 */
export class WidgetTradeMenu {
  readonly button: HTMLButtonElement;
  private menu: WidgetContextMenu | null = null;
  /** The panels open now, ticked in the menu. */
  private open = new Set<TradeId>();

  /** A Trade menu for these callbacks, or `null` when the host gave none of them. */
  static create(
    callbacks: ToolbarCallbacks,
    t: Translator,
    root: () => HTMLElement,
    anchorOf: (btn: HTMLElement) => HTMLElement,
  ): WidgetTradeMenu | null {
    const items = tradeItems(callbacks, t);
    return items.length > 0 ? new WidgetTradeMenu(items, t, root, anchorOf) : null;
  }

  private constructor(
    private readonly items: TradeItem[],
    private readonly t: Translator,
    private readonly root: () => HTMLElement,
    anchorOf: (btn: HTMLElement) => HTMLElement,
  ) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tcw-dropdown-trigger tcw-toolbar-overflow';
    btn.dataset.role = 'trade';
    btn.dataset.icon = 'trendingUp';
    btn.title = t('toolbar.trade');
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    markPart(btn, 'toolbar.trade');
    btn.innerHTML = `${createIcon('trendingUp', 14)} <span class="tcw-trigger-label">${esc(t('toolbar.trade'))}</span> ${createIcon('chevronDown', 12)}`;
    btn.addEventListener('click', () => this.toggle(anchorOf(btn)));
    this.button = btn;
  }

  /** Hide the button once every item in it is switched off. */
  tidy(): void {
    this.button.hidden = this.items.every((item) => this.isOff(item.parts));
  }

  /** Tick a panel (`'ladder'`, `'account'`) while it is open; other roles are not the menu's. */
  setOpen(role: string, on: boolean): void {
    const panel = PANELS.find((id) => id === role);
    if (!panel) return;
    if (on) this.open.add(panel);
    else this.open.delete(panel);
  }

  destroy(): void {
    this.menu?.destroy();
    this.button.remove();
  }

  /** Whether any of `parts` is switched off on the widget. */
  private isOff(parts: readonly WidgetFeature[]): boolean {
    const off = new Set((this.root().getAttribute('data-tcw-off') ?? '').split(/\s+/).filter(Boolean));
    return parts.some((name) => off.has(name));
  }

  /** The menu under `anchor`: the tools not switched off, the open panels ticked. */
  private toggle(anchor: HTMLElement): void {
    if (this.menu?.isOpen()) {
      this.menu.close();
      return;
    }
    const items = this.items.filter((item) => !this.isOff(item.parts));
    if (items.length === 0) return;
    const actions = items.filter((item) => !PANELS.includes(item.id));
    const panels = items.filter((item) => PANELS.includes(item.id));
    // The orders, then a rule, then the panels (ticked while open).
    const entries: ContextMenuEntry[] = [
      ...actions.map((item) => ({ id: item.id, label: item.label, icon: ACTION_ICONS[item.id] })),
      ...(actions.length > 0 && panels.length > 0 ? ['separator' as const] : []),
      ...panels.map((item) => ({ id: item.id, label: item.label, checked: this.open.has(item.id) })),
    ];
    const root = this.root();
    this.menu ??= new WidgetContextMenu(root, this.t('toolbar.trade'));
    // From the button's start edge (its right, right to left), or ending at its end without room.
    this.menu.openUnder(entries, anchor, (id) => {
      items.find((item) => item.id === id)?.run();
    });
  }
}
