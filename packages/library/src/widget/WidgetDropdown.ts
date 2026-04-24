export class WidgetDropdown {
  private trigger: HTMLElement;
  private panel: HTMLDivElement;
  private _isOpen = false;
  private onOutsideClick: (e: MouseEvent) => void;
  private onEscapeKey: (e: KeyboardEvent) => void;
  private onTriggerClick: () => void;

  constructor(trigger: HTMLElement, config: { width?: string; align?: 'left' | 'right' } = {}) {
    this.trigger = trigger;

    this.panel = document.createElement('div');
    this.panel.className = 'tcw-dropdown';
    this.panel.style.width = config.width ?? '200px';
    if (config.align === 'right') {
      this.panel.style.right = '0';
    } else {
      this.panel.style.left = '0';
    }
    this.panel.style.display = 'none';

    // Position relative to trigger
    trigger.style.position = 'relative';
    trigger.appendChild(this.panel);

    this.onTriggerClick = () => {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    };

    this.onOutsideClick = (e: MouseEvent) => {
      if (!this.trigger.contains(e.target as Node)) {
        this.close();
      }
    };

    this.onEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };

    trigger.addEventListener('click', this.onTriggerClick);
  }

  setContent(html: string): void {
    this.panel.innerHTML = html;
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.panel.style.display = '';
    document.addEventListener('mousedown', this.onOutsideClick);
    document.addEventListener('keydown', this.onEscapeKey);
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.panel.style.display = 'none';
    document.removeEventListener('mousedown', this.onOutsideClick);
    document.removeEventListener('keydown', this.onEscapeKey);
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  destroy(): void {
    this.trigger.removeEventListener('click', this.onTriggerClick);
    document.removeEventListener('mousedown', this.onOutsideClick);
    document.removeEventListener('keydown', this.onEscapeKey);
    this.panel.remove();
  }
}
