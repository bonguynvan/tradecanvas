import type { OrderPlaceIntent, TradingConfig, Point } from '@chart-lib/commons';

export class TradingContextMenu {
  private menuElement: HTMLElement | null = null;
  private removeHandler: (() => void) | null = null;
  onItemSelect: ((intent: OrderPlaceIntent) => void) | null = null;

  show(pos: Point, price: number, container: HTMLElement, config: TradingConfig): void {
    this.hide();
    if (!config.contextMenu?.enabled) return;

    const precision = config.pricePrecision ?? 2;
    const priceStr = price.toFixed(precision);

    const menu = document.createElement('div');
    menu.style.cssText = `
      position: absolute;
      left: ${pos.x}px;
      top: ${pos.y}px;
      background: #1e222d;
      border: 1px solid #363a45;
      border-radius: 6px;
      padding: 4px 0;
      z-index: 1000;
      min-width: 180px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
    `;

    const items: { label: string; intent: OrderPlaceIntent }[] = [
      { label: `Buy Limit @ ${priceStr}`, intent: { side: 'buy', type: 'limit', price } },
      { label: `Sell Limit @ ${priceStr}`, intent: { side: 'sell', type: 'limit', price } },
      { label: `Buy Stop @ ${priceStr}`, intent: { side: 'buy', type: 'stop', price } },
      { label: `Sell Stop @ ${priceStr}`, intent: { side: 'sell', type: 'stop', price } },
    ];

    for (const item of items) {
      const el = document.createElement('div');
      const isBuy = item.intent.side === 'buy';
      el.textContent = item.label;
      el.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        color: ${isBuy ? '#26A69A' : '#EF5350'};
        transition: background 0.1s;
      `;
      el.addEventListener('mouseenter', () => { el.style.background = '#2a2e39'; });
      el.addEventListener('mouseleave', () => { el.style.background = 'transparent'; });
      el.addEventListener('click', () => {
        this.onItemSelect?.(item.intent);
        this.hide();
      });
      menu.appendChild(el);
    }

    container.appendChild(menu);
    this.menuElement = menu;

    // Close on outside click or Escape
    const closeHandler = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        this.hide();
      } else if (e instanceof MouseEvent && !menu.contains(e.target as Node)) {
        this.hide();
      }
    };
    document.addEventListener('mousedown', closeHandler);
    document.addEventListener('keydown', closeHandler);
    this.removeHandler = () => {
      document.removeEventListener('mousedown', closeHandler);
      document.removeEventListener('keydown', closeHandler);
    };
  }

  hide(): void {
    this.menuElement?.remove();
    this.menuElement = null;
    this.removeHandler?.();
    this.removeHandler = null;
  }

  destroy(): void {
    this.hide();
    this.onItemSelect = null;
  }
}
