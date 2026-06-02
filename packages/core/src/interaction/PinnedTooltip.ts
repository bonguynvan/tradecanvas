import type { OHLCBar, Theme, ViewportState } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';

/**
 * Pinned OHLC tooltip — a second DOM tooltip anchored to a specific bar index.
 *
 * Designed to work alongside the live `CrosshairTooltip`: user pins bar A
 * (Alt+click), then hovers bar B → the live tooltip shows bar B, the pinned
 * tooltip stays on bar A, and the delta strip on the pinned tooltip shows
 * price / time / bar-count differences between the two.
 *
 * Implementation notes:
 *   - DOM rather than canvas so the same styling pipeline as the live
 *     tooltip is reused (and text remains selectable for screen readers).
 *   - Positioning is driven externally via `reposition()` so the Chart can
 *     batch it inside its sync loop instead of paying for a per-frame DOM
 *     read.
 *   - Uses `transform: translate(...)` for repositioning to stay on the
 *     compositor layer.
 */
export class PinnedTooltip {
  private el: HTMLElement | null = null;
  private deltaEl: HTMLElement | null = null;
  private timeEl: HTMLElement | null = null;
  private ohlcEl: HTMLElement | null = null;
  private pinnedBar: OHLCBar | null = null;
  private pinnedIndex = -1;

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
      pointerEvents: 'auto',
      cursor: 'pointer',
      zIndex: '99',
      whiteSpace: 'nowrap',
      willChange: 'transform',
    });

    this.timeEl = document.createElement('div');
    this.ohlcEl = document.createElement('div');
    this.deltaEl = document.createElement('div');
    this.deltaEl.style.marginTop = '4px';
    this.deltaEl.style.paddingTop = '4px';
    this.deltaEl.style.borderTop = '1px solid currentColor';
    this.deltaEl.style.opacity = '0.85';
    this.deltaEl.style.fontVariantNumeric = 'tabular-nums';

    this.el.appendChild(this.timeEl);
    this.el.appendChild(this.ohlcEl);
    this.el.appendChild(this.deltaEl);

    // Small "pin" badge so the user knows what they're looking at.
    const pinBadge = document.createElement('div');
    pinBadge.textContent = '📌 pinned';
    pinBadge.style.fontSize = '9px';
    pinBadge.style.opacity = '0.6';
    pinBadge.style.marginBottom = '2px';
    pinBadge.style.letterSpacing = '0.04em';
    pinBadge.style.textTransform = 'uppercase';
    this.el.insertBefore(pinBadge, this.timeEl);

    container.appendChild(this.el);
  }

  pin(bar: OHLCBar, barIndex: number, theme: Theme): void {
    if (!this.el || !this.timeEl || !this.ohlcEl) return;
    this.pinnedBar = bar;
    this.pinnedIndex = barIndex;

    const isUp = bar.close >= bar.open;
    const color = isUp ? theme.candleUp : theme.candleDown;

    const d = new Date(bar.time > 1e12 ? bar.time : bar.time * 1000);
    this.timeEl.textContent = `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.timeEl.style.color = theme.textSecondary;

    this.ohlcEl.innerHTML = `
      <span style="opacity:.6">O </span><span style="color:${color}">${fmt(bar.open)}</span>
      <span style="opacity:.6"> H </span><span style="color:${color}">${fmt(bar.high)}</span>
      <span style="opacity:.6"> L </span><span style="color:${color}">${fmt(bar.low)}</span>
      <span style="opacity:.6"> C </span><span style="color:${color}">${fmt(bar.close)}</span>
    `;

    const isDark = isDarkColor(theme.background);
    this.el.style.background = withAlpha(theme.background, isDark ? 0.96 : 0.97);
    this.el.style.border = `1px solid ${color}`;
    this.el.style.boxShadow = isDark
      ? '0 4px 12px rgba(0,0,0,0.55)'
      : '0 4px 12px rgba(0,0,0,0.18)';
    this.el.style.color = theme.text;
    this.el.style.backdropFilter = 'blur(8px)';

    this.el.style.display = 'block';
  }

  unpin(): void {
    this.pinnedBar = null;
    this.pinnedIndex = -1;
    if (this.el) this.el.style.display = 'none';
  }

  isPinned(): boolean {
    return this.pinnedBar !== null;
  }

  getPinnedIndex(): number {
    return this.pinnedIndex;
  }

  /**
   * Reposition the tooltip at the pinned bar's screen X, and refresh the
   * delta strip against the bar currently under the crosshair. Called by
   * the Chart on every viewport sync (cheap — only DOM writes).
   */
  reposition(viewport: ViewportState, hoverBar: OHLCBar | null, hoverIndex: number | null, theme: Theme): void {
    if (!this.el || !this.pinnedBar) return;

    const x = barIndexToX(this.pinnedIndex, viewport);
    const y = priceToY(this.pinnedBar.close, viewport);

    // Clip to chart bounds — if the pinned bar is scrolled out of view, fade.
    const r = viewport.chartRect;
    const inView = x >= r.x - 4 && x <= r.x + r.width + 4;
    this.el.style.opacity = inView ? '1' : '0.35';

    const left = Math.max(r.x, Math.min(r.x + r.width - 180, x + 8));
    const top = Math.max(r.y, Math.min(r.y + r.height - 90, y - 64));
    this.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    this.el.style.left = '0';
    this.el.style.top = '0';

    if (this.deltaEl) {
      if (hoverBar && hoverIndex !== null && hoverIndex !== this.pinnedIndex) {
        const priceΔ = hoverBar.close - this.pinnedBar.close;
        const pct = this.pinnedBar.close !== 0 ? (priceΔ / this.pinnedBar.close) * 100 : 0;
        const sign = priceΔ > 0 ? '+' : priceΔ < 0 ? '−' : '';
        const barΔ = hoverIndex - this.pinnedIndex;
        const direction = priceΔ >= 0 ? theme.candleUp : theme.candleDown;
        this.deltaEl.style.color = direction;
        this.deltaEl.innerHTML = `Δ ${sign}${fmt(Math.abs(priceΔ))} <span style="opacity:.7">(${sign}${Math.abs(pct).toFixed(2)}%)</span> · ${barΔ > 0 ? '+' : ''}${barΔ} bars`;
        this.deltaEl.style.display = 'block';
      } else {
        this.deltaEl.style.display = 'none';
      }
    }
  }

  destroy(): void {
    this.el?.remove();
    this.el = null;
    this.deltaEl = null;
    this.timeEl = null;
    this.ohlcEl = null;
    this.pinnedBar = null;
    this.pinnedIndex = -1;
  }
}

function fmt(v: number): string {
  return v.toFixed(2);
}

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

function isDarkColor(color: string): boolean {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  }
  return true;
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
