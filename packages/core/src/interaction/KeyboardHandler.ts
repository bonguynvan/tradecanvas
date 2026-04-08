/**
 * Keyboard navigation for chart.
 * Arrow keys: navigate bars. +/-: zoom. Home/End: jump to start/end.
 * Shift+Arrow: fast navigation (10 bars). Double-click: fit content.
 */
export interface KeyboardCallbacks {
  scrollBars: (count: number) => void;
  zoom: (delta: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  fitContent: () => void;
}

export class KeyboardHandler {
  private callbacks: KeyboardCallbacks;
  private enabled = true;

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  handleKey(e: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    const shift = e.shiftKey;
    const step = shift ? 10 : 1;

    switch (e.key) {
      case 'ArrowLeft':
        this.callbacks.scrollBars(-step);
        return true;
      case 'ArrowRight':
        this.callbacks.scrollBars(step);
        return true;
      case 'ArrowUp':
      case '+':
      case '=':
        this.callbacks.zoom(0.1);
        return true;
      case 'ArrowDown':
      case '-':
        this.callbacks.zoom(-0.1);
        return true;
      case 'Home':
        this.callbacks.goToStart();
        return true;
      case 'End':
        this.callbacks.goToEnd();
        return true;
      case ' ':
        this.callbacks.fitContent();
        return true;
      default:
        return false;
    }
  }
}
