import type { OHLCBar, Theme, Point } from '@chart-lib/commons';

/**
 * High-performance floating tooltip.
 * Pre-builds DOM structure once, updates only textContent on hover.
 * No innerHTML, no offsetWidth reads, no layout thrashing.
 */
export class CrosshairTooltip {
  private el: HTMLElement | null = null;
  private visible = false;

  // Pre-built child nodes — updated via textContent (no reflow)
  private timeEl!: HTMLElement;
  private openEl!: HTMLElement;
  private highEl!: HTMLElement;
  private lowEl!: HTMLElement;
  private closeEl!: HTMLElement;
  private changeEl!: HTMLElement;
  private volEl!: HTMLElement;

  // Cached dimensions (measured once, avoids offsetWidth reads)
  private measuredWidth = 155;
  private measuredHeight = 95;
  private measured = false;

  create(container: HTMLElement): void {
    if (this.el) return;

    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      display: 'none',
      padding: '6px 10px',
      borderRadius: '4px',
      fontSize: '11px',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      lineHeight: '1.5',
      pointerEvents: 'none',
      zIndex: '100',
      whiteSpace: 'nowrap',
      willChange: 'transform', // GPU layer for smooth repositioning
    });

    // Pre-build structure with reusable spans
    this.timeEl = this.addLine(this.el);
    const row1 = this.addLine(this.el);
    const row2 = this.addLine(this.el);
    this.changeEl = this.addLine(this.el);
    this.volEl = this.addLine(this.el);

    // O/H in row1, L/C in row2
    row1.append(this.label('O '), this.openEl = this.val(), this.label(' H '), this.highEl = this.val());
    row2.append(this.label('L '), this.lowEl = this.val(), this.label(' C '), this.closeEl = this.val());

    container.appendChild(this.el);
  }

  show(pos: Point, bar: OHLCBar, theme: Theme, containerRect: { width: number; height: number }): void {
    if (!this.el) return;

    const isUp = bar.close >= bar.open;
    const color = isUp ? theme.candleUp : theme.candleDown;

    // Fast number formatting (avoid toLocaleString)
    const fmt = (v: number) => v.toFixed(2);

    // Update text only (no DOM structure changes, no reflow)
    const d = new Date(bar.time);
    this.timeEl.textContent = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    this.timeEl.style.color = theme.textSecondary;

    this.openEl.textContent = fmt(bar.open);
    this.highEl.textContent = fmt(bar.high);
    this.lowEl.textContent = fmt(bar.low);
    this.closeEl.textContent = fmt(bar.close);

    this.openEl.style.color = color;
    this.highEl.style.color = color;
    this.lowEl.style.color = color;
    this.closeEl.style.color = color;

    const change = bar.close - bar.open;
    const pct = bar.open !== 0 ? (change / bar.open * 100) : 0;
    const sign = change >= 0 ? '+' : '';
    this.changeEl.textContent = `${sign}${fmt(change)} (${sign}${pct.toFixed(2)}%)`;
    this.changeEl.style.color = color;

    const v = bar.volume;
    this.volEl.textContent = `Vol ${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toFixed(0)}`;
    this.volEl.style.color = theme.textSecondary;

    // Style — use theme tokens with alpha overlay
    // Detect dark vs light theme by parsing the background luminance
    const isDark = isDarkColor(theme.background);
    this.el.style.background = isDark
      ? withAlpha(theme.background, 0.95)
      : withAlpha(theme.background, 0.97);
    this.el.style.border = `1px solid ${theme.axisLine}`;
    this.el.style.boxShadow = isDark
      ? '0 4px 12px rgba(0,0,0,0.5)'
      : '0 4px 12px rgba(0,0,0,0.15)';
    this.el.style.color = theme.text;
    // Backdrop blur for depth (optional, browser-dependent)
    this.el.style.backdropFilter = 'blur(8px)';

    // Measure once after first show
    if (!this.measured && this.visible) {
      this.measuredWidth = this.el.offsetWidth;
      this.measuredHeight = this.el.offsetHeight;
      this.measured = true;
    }

    // Position using transform (no layout trigger, GPU-composited)
    let x = pos.x + 16;
    let y = pos.y - 40;
    if (x + this.measuredWidth > containerRect.width - 80) x = pos.x - this.measuredWidth - 16;
    if (y < 4) y = 4;
    if (y + this.measuredHeight > containerRect.height) y = containerRect.height - this.measuredHeight - 4;

    this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    this.el.style.left = '0';
    this.el.style.top = '0';

    if (!this.visible) {
      this.el.style.display = 'block';
      this.visible = true;
    }
  }

  hide(): void {
    if (this.el && this.visible) {
      this.el.style.display = 'none';
      this.visible = false;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.el?.remove();
    this.el = null;
    this.visible = false;
    this.measured = false;
  }

  private addLine(parent: HTMLElement): HTMLElement {
    const div = document.createElement('div');
    parent.appendChild(div);
    return div;
  }

  private label(text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.opacity = '0.6';
    return span;
  }

  private val(): HTMLSpanElement {
    return document.createElement('span');
  }
}

/** Detect if a hex/rgb color is dark (luminance < 0.5) */
function isDarkColor(color: string): boolean {
  // Parse hex like #0f1729 or #fff
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3
      ? hex.split('').map(c => c + c).join('')
      : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    // Relative luminance approximation (sRGB)
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luma < 0.5;
  }
  // Parse rgb(r, g, b) or rgba(r, g, b, a)
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luma < 0.5;
  }
  return true; // assume dark if unknown
}

/** Add alpha to a hex color */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3
      ? hex.split('').map(c => c + c).join('')
      : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
