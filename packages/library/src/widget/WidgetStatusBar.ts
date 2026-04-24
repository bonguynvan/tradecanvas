export class WidgetStatusBar {
  private el: HTMLDivElement;
  private dotEl: HTMLSpanElement;
  private messageEl: HTMLSpanElement;
  private infoEl: HTMLSpanElement;

  constructor(host: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-statusbar';

    const indicator = document.createElement('div');
    indicator.className = 'tcw-status-indicator';

    this.dotEl = document.createElement('span');
    this.dotEl.className = 'tcw-status-dot';
    indicator.appendChild(this.dotEl);

    this.messageEl = document.createElement('span');
    indicator.appendChild(this.messageEl);

    this.el.appendChild(indicator);

    this.infoEl = document.createElement('span');
    this.el.appendChild(this.infoEl);

    host.appendChild(this.el);
  }

  update(state: { connectionState: string; message: string; symbol: string; timeframe: string }): void {
    this.dotEl.className = 'tcw-status-dot';
    if (state.connectionState === 'connected') {
      this.dotEl.classList.add('tcw-connected');
    } else if (state.connectionState === 'error') {
      this.dotEl.classList.add('tcw-error');
    }

    this.messageEl.textContent = state.message;
    this.infoEl.textContent = `${state.symbol} ${state.timeframe}`;
  }

  destroy(): void {
    this.el.remove();
  }
}
