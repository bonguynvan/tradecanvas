import type { OrderPlaceIntent, TradingConfig, Point } from '@tradecanvas/commons';

export class TradingContextMenu {
  private menuElement: HTMLElement | null = null;
  private removeHandler: (() => void) | null = null;
  onItemSelect: ((intent: OrderPlaceIntent) => void) | null = null;

  show(pos: Point, price: number, container: HTMLElement, config: TradingConfig, formatPrice?: (price: number) => string): void {
    this.hide();
    if (!config.contextMenu?.enabled) return;

    const precision = config.pricePrecision ?? 2;
    const priceStr = formatPrice?.(price) ?? price.toFixed(precision);

    const menu = document.createElement('div');
    menu.style.cssText = `
      position: absolute;
      left: ${pos.x}px;
      top: ${pos.y}px;
      background: #161b23;
      border: 1px solid #2a323e;
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
        color: ${isBuy ? '#1fa874' : '#e8505b'};
        transition: background 0.1s;
      `;
      el.addEventListener('mouseenter', () => { el.style.background = '#1f2630'; });
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
