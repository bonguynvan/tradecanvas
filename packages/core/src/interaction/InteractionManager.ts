import type { Point, ViewportState } from '@tradecanvas/commons';
import type { PanHandler } from './PanHandler.js';
import type { ZoomHandler } from './ZoomHandler.js';
import type { CrosshairHandler } from './CrosshairHandler.js';
import type { AxisDragHandler } from './AxisDragHandler.js';
import type { AlertDragHandler } from './AlertDragHandler.js';
import type { DrawingManager } from '../drawings/DrawingManager.js';
import type { TradingManager } from '../trading/TradingManager.js';
import type { PaneResizeHandler } from './PaneResizeHandler.js';

export class InteractionManager {
  private panHandler: PanHandler | null = null;
  private zoomHandler: ZoomHandler | null = null;
  private crosshairHandler: CrosshairHandler | null = null;
  private axisDragHandler: AxisDragHandler | null = null;
  private alertDragHandler: AlertDragHandler | null = null;
  private axisViewportGetter: (() => ViewportState) | null = null;
  private onAxisDoubleClick: ((axis: 'price' | 'time') => void) | null = null;
  private measureHandlers: {
    begin: (pos: Point) => void;
    move: (pos: Point) => void;
    end: () => void;
  } | null = null;
  private measuring = false;
  private onAltClick: ((pos: Point) => void) | null = null;
  private onEscape: (() => void) | null = null;
  private onConfirm: (() => boolean) | null = null;
  private onClick: ((pos: Point) => void) | null = null;
  private downPos: Point | null = null;
  private downMoved = false;
  private pressForClick = false;
  private drawingManager: DrawingManager | null = null;
  private tradingManager: TradingManager | null = null;
  private paneResizeHandler: PaneResizeHandler | null = null;
  private viewportGetter: (() => ViewportState) | null = null;
  private onOverlayDirty: (() => void) | null = null;
  private boundHandlers: (() => void)[] = [];

  // Touch state
  private lastTouchDist = 0;
  private lastTouchMid: Point = { x: 0, y: 0 };
  private touchActive = false;
  private touchStartPos: Point = { x: 0, y: 0 };
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly longPressMs = 500;
  private readonly longPressMaxMove = 8;

  // Cached bounding rect — avoid a layout read per mousemove.
  // Invalidated on pointerdown, window resize, and explicit calls.
  private cachedRect: DOMRect | null = null;

  constructor(private element: HTMLElement) {}

  setOverlayDirtyCallback(cb: () => void): void { this.onOverlayDirty = cb; }

  setPanHandler(handler: PanHandler): void { this.panHandler = handler; }
  setZoomHandler(handler: ZoomHandler): void { this.zoomHandler = handler; }
  setCrosshairHandler(handler: CrosshairHandler): void { this.crosshairHandler = handler; }

  /**
   * Enable drag-to-scale on the price + time axis regions. The viewport getter
   * lets us hit-test the chartRect on every pointer event (cheap), so this
   * picks up panel/layout changes for free.
   */
  /**
   * Shift-drag measure tool. The handlers are simple position callbacks; the
   * Chart converts pos → bar index + price internally.
   */
  /**
   * Alt/Option+click on the chart area. Used by the pinned-tooltip feature
   * so the gesture doesn't collide with drawing tools (plain click) or with
   * the trading context menu (right-click).
   */
  setAltClickHandler(handler: (pos: Point) => void): void {
    this.onAltClick = handler;
  }

  /** Wire an `Escape` keydown to the host — used to unpin tooltips, etc. */
  setEscapeHandler(handler: () => void): void {
    this.onEscape = handler;
  }

  /** Wire an `Enter` keydown — used to confirm bracket placement. Return true if handled. */
  setConfirmHandler(handler: () => boolean): void {
    this.onConfirm = handler;
  }

  /** Wire a plain left-click on the chart area (press + release without drag). */
  setClickHandler(handler: (pos: Point) => void): void {
    this.onClick = handler;
  }

  setMeasureHandlers(handlers: {
    begin: (pos: Point) => void;
    move: (pos: Point) => void;
    end: () => void;
  }): void {
    this.measureHandlers = handlers;
  }

  setAxisDragHandler(
    handler: AxisDragHandler,
    viewportGetter: () => ViewportState,
    onDoubleClick?: (axis: 'price' | 'time') => void,
  ): void {
    this.axisDragHandler = handler;
    this.axisViewportGetter = viewportGetter;
    this.onAxisDoubleClick = onDoubleClick ?? null;
  }

  setDrawingManager(manager: DrawingManager, viewportGetter: () => ViewportState): void {
    this.drawingManager = manager;
    this.viewportGetter = viewportGetter;
  }

  /** Enable dragging price-alert lines. Hit-tested after trading/drawing. */
  setAlertDragHandler(handler: AlertDragHandler): void {
    this.alertDragHandler = handler;
  }

  setTradingManager(manager: TradingManager, viewportGetter: () => ViewportState): void {
    this.tradingManager = manager;
    this.viewportGetter = viewportGetter;
  }

  /** Enable dragging pane dividers to resize indicator panels. */
  setPaneResizeHandler(handler: PaneResizeHandler): void {
    this.paneResizeHandler = handler;
  }

  attach(): void {
    const getVP = () => this.viewportGetter?.() ?? null;

    // Axis hit-test: returns 'price' if pointer is in the right-side price
    // axis strip, 'time' if in the bottom time-axis strip, null otherwise.
    const hitAxis = (pos: Point): 'price' | 'time' | null => {
      const vp = this.axisViewportGetter?.();
      if (!vp) return null;
      const r = vp.chartRect;
      // Bottom strip wins if we're in the corner — clicking the corner is
      // ambiguous, but bottom is the rarer / less-disruptive default.
      if (pos.y > r.y + r.height) return 'time';
      if (pos.x > r.x + r.width) return 'price';
      return null;
    };

    // --- Mouse events ---
    const onMouseDown = (e: MouseEvent) => {
      // Cheap refresh point — ensures the rect is current for the
      // interaction that follows (drag, pan, draw, etc.).
      this.invalidateRect();
      const pos = this.getMousePos(e);
      const vp = getVP();

      // Click tracking — only a press that falls through to pan (i.e. an empty
      // chart-area press) and is released without drag counts as a click.
      this.downPos = pos;
      this.downMoved = false;
      this.pressForClick = false;

      // Axis drag has priority — clicking the price/time strip should never
      // start drawing or open the trading menu.
      const axis = hitAxis(pos);
      if (axis && this.axisDragHandler) {
        this.axisDragHandler.begin(axis, pos);
        return;
      }

      // Pane divider drag — resize indicator panes. Checked early (after the
      // axis strips) so a divider press never starts drawing or trading.
      if (this.paneResizeHandler?.tryBegin(pos)) return;

      // Shift-drag measure tool — bypasses pan/draw/trade. Tracked separately
      // because the gesture spans mousedown→mouseup and crosshair should be
      // suppressed while measuring.
      if (e.shiftKey && this.measureHandlers) {
        this.measuring = true;
        this.measureHandlers.begin(pos);
        this.onOverlayDirty?.();
        return;
      }

      // Alt/Option-click pins the OHLC tooltip at the hovered bar. Pure
      // discrete action, doesn't enter any drag state.
      if (e.altKey && this.onAltClick) {
        this.onAltClick(pos);
        return;
      }

      if (this.tradingManager && vp && this.tradingManager.onPointerDown(pos, vp)) return;
      if (this.drawingManager && vp && this.drawingManager.onPointerDown(pos, vp)) return;
      // Alert lines are draggable — precise hit-test (a few px), so this only
      // claims the gesture when the pointer is right on a line.
      if (this.alertDragHandler?.tryBegin(pos)) {
        this.onOverlayDirty?.();
        return;
      }
      this.pressForClick = true;
      this.panHandler?.onPointerDown(pos);
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = this.getMousePos(e);
      const vp = getVP();

      // Cancel a pending click once the pointer drifts past ~4px.
      if (this.downPos && !this.downMoved) {
        const dx = pos.x - this.downPos.x;
        const dy = pos.y - this.downPos.y;
        if (dx * dx + dy * dy > 16) this.downMoved = true;
      }

      // Axis drag in progress — owns the gesture exclusively.
      if (this.axisDragHandler?.isActive()) {
        this.axisDragHandler.move(pos);
        return;
      }

      // Pane resize in progress — owns the gesture exclusively.
      if (this.paneResizeHandler?.isActive()) {
        this.paneResizeHandler.move(pos);
        return;
      }

      // Alert drag in progress — owns the gesture exclusively.
      if (this.alertDragHandler?.isActive()) {
        this.alertDragHandler.move(pos);
        this.onOverlayDirty?.();
        return;
      }

      if (this.measuring && this.measureHandlers) {
        this.measureHandlers.move(pos);
        this.onOverlayDirty?.();
        return;
      }

      // Hover cursor over axis strips / pane dividers (only when idle).
      const axisHover = hitAxis(pos);
      const paneCursor = this.paneResizeHandler?.cursorAt(pos) ?? null;
      if (axisHover === 'price') {
        this.element.style.cursor = 'ns-resize';
      } else if (axisHover === 'time') {
        this.element.style.cursor = 'ew-resize';
      } else if (this.alertDragHandler?.isOverAlert(pos)) {
        this.element.style.cursor = 'ns-resize';
      } else if (paneCursor) {
        this.element.style.cursor = paneCursor;
      } else if (this.element.style.cursor === 'ns-resize' || this.element.style.cursor === 'ew-resize') {
        this.element.style.cursor = '';
      }

      if (this.tradingManager && vp && this.tradingManager.onPointerMove(pos, vp)) {
        this.crosshairHandler?.onPointerMove(pos);
        this.onOverlayDirty?.();
        return;
      }
      if (this.drawingManager && vp && this.drawingManager.onPointerMove(pos, vp)) {
        this.crosshairHandler?.onPointerMove(pos);
        this.onOverlayDirty?.();
        return;
      }
      this.panHandler?.onPointerMove(pos);
      this.crosshairHandler?.onPointerMove(pos);
      this.onOverlayDirty?.();
    };

    const onMouseUp = () => {
      if (this.axisDragHandler?.isActive()) {
        this.axisDragHandler.end();
        return;
      }
      if (this.paneResizeHandler?.isActive()) {
        this.paneResizeHandler.end();
        return;
      }
      if (this.alertDragHandler?.isActive()) {
        this.alertDragHandler.end();
        this.onOverlayDirty?.();
        return;
      }
      if (this.measuring && this.measureHandlers) {
        this.measuring = false;
        this.measureHandlers.end();
        this.onOverlayDirty?.();
        return;
      }
      if (this.tradingManager?.onPointerUp()) return;
      if (this.drawingManager?.onPointerUp()) return;
      this.panHandler?.onPointerUp();

      // A press that fell through to pan and was released without drifting is a
      // chart click.
      if (this.pressForClick && !this.downMoved && this.downPos && this.onClick) {
        this.onClick(this.downPos);
      }
      this.pressForClick = false;
      this.downPos = null;
    };

    const onDblClick = (e: MouseEvent) => {
      const pos = this.getMousePos(e);
      const axis = hitAxis(pos);
      if (axis && this.onAxisDoubleClick) {
        this.onAxisDoubleClick(axis);
      }
    };

    const onMouseLeave = () => {
      this.panHandler?.onPointerUp();
      this.drawingManager?.onPointerUp();
      this.tradingManager?.onPointerUp();
      this.alertDragHandler?.end();
      this.paneResizeHandler?.end();
      this.crosshairHandler?.onPointerLeave();
      // Reset click tracking — if the pointer leaves mid-press, the later
      // document-level mouseup must not fire a spurious click.
      this.pressForClick = false;
      this.downPos = null;
      this.onOverlayDirty?.();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pos = this.getMousePos(e);
      this.zoomHandler?.onWheel(e.deltaY, pos);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.onEscape) {
        this.onEscape();
      }
      if (e.key === 'Enter' && this.onConfirm && this.onConfirm()) {
        e.preventDefault();
        return;
      }
      if (this.drawingManager?.onKeyDown(e.key, e.ctrlKey || e.metaKey)) e.preventDefault();
    };

    const onContextMenu = (e: MouseEvent) => {
      const vp = getVP();
      if (!this.tradingManager || !vp) return;
      const shown = this.tradingManager.onContextMenu(this.getMousePos(e), vp);
      // Only suppress the native menu when the trading context menu actually
      // opened — otherwise users with trading disabled lose right-click entirely.
      if (shown) e.preventDefault();
    };

    // --- Touch events ---
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      this.invalidateRect();
      if (e.touches.length === 1) {
        const pos = this.getTouchPos(e.touches[0]);
        this.touchStartPos = pos;

        // Axis strip touch → start drag-scaling (single-finger drag inside the
        // axis is the mobile equivalent of mousedown on the axis).
        const axis = hitAxis(pos);
        if (axis && this.axisDragHandler) {
          this.axisDragHandler.begin(axis, pos);
          this.touchActive = true;
          return;
        }

        // Pane divider drag (touch) — resize indicator panes.
        if (this.paneResizeHandler?.tryBegin(pos)) {
          this.touchActive = true;
          return;
        }

        // Trading drag (bracket handles, order/position lines) — same priority
        // as on desktop so the bracket is adjustable by touch.
        const tvp = getVP();
        if (this.tradingManager && tvp && this.tradingManager.onPointerDown(pos, tvp)) {
          this.touchActive = true;
          this.onOverlayDirty?.();
          return;
        }

        // Long-press to pin the OHLC tooltip — mobile equivalent of Alt+click.
        // Cancelled by movement > threshold or by a second finger landing.
        if (this.onAltClick) {
          this.clearLongPress();
          this.longPressTimer = setTimeout(() => {
            this.longPressTimer = null;
            this.onAltClick?.(pos);
            // Stop the pan gesture that started under the press so it doesn't
            // suddenly jolt the chart when the user lifts their finger.
            this.panHandler?.onPointerUp();
            this.onOverlayDirty?.();
          }, this.longPressMs);
        }

        // Single finger: pan
        this.panHandler?.onPointerDown(pos);
        this.crosshairHandler?.onPointerMove(pos);
        this.touchActive = true;
      } else if (e.touches.length === 2) {
        // Two fingers: start pinch-to-zoom — abort any pending long-press.
        this.clearLongPress();
        this.panHandler?.onPointerUp(); // Stop panning
        this.lastTouchDist = this.getTouchDistance(e.touches[0], e.touches[1]);
        this.lastTouchMid = this.getTouchMidpoint(e.touches[0], e.touches[1]);
        this.touchActive = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.touchActive) {
        const pos = this.getTouchPos(e.touches[0]);

        // Cancel long-press if the finger drifts past the slop threshold.
        if (this.longPressTimer) {
          const dx = pos.x - this.touchStartPos.x;
          const dy = pos.y - this.touchStartPos.y;
          if (Math.hypot(dx, dy) > this.longPressMaxMove) this.clearLongPress();
        }

        if (this.axisDragHandler?.isActive()) {
          this.axisDragHandler.move(pos);
          this.onOverlayDirty?.();
          return;
        }

        if (this.paneResizeHandler?.isActive()) {
          this.paneResizeHandler.move(pos);
          this.onOverlayDirty?.();
          return;
        }

        const tvp = getVP();
        if (this.tradingManager && tvp && this.tradingManager.onPointerMove(pos, tvp)) {
          this.onOverlayDirty?.();
          return;
        }

        this.panHandler?.onPointerMove(pos);
        this.crosshairHandler?.onPointerMove(pos);
      } else if (e.touches.length === 2) {
        const dist = this.getTouchDistance(e.touches[0], e.touches[1]);
        const mid = this.getTouchMidpoint(e.touches[0], e.touches[1]);

        // Pinch zoom
        if (this.lastTouchDist > 0) {
          const scale = dist / this.lastTouchDist;
          const delta = (scale - 1) * 0.5; // Dampen
          this.zoomHandler?.onWheel(-delta * 100, mid);
        }

        // Two-finger pan
        const dx = this.lastTouchMid.x - mid.x;
        if (Math.abs(dx) > 1) {
          this.panHandler?.onPointerDown(this.lastTouchMid);
          this.panHandler?.onPointerMove(mid);
        }

        this.lastTouchDist = dist;
        this.lastTouchMid = mid;
      }
      this.onOverlayDirty?.();
    };

    const onTouchEnd = (e: TouchEvent) => {
      this.clearLongPress();
      if (e.touches.length === 0) {
        if (this.axisDragHandler?.isActive()) {
          this.axisDragHandler.end();
        }
        this.paneResizeHandler?.end();
        this.tradingManager?.onPointerUp();
        this.panHandler?.onPointerUp();
        this.crosshairHandler?.onPointerLeave();
        this.touchActive = false;
        this.lastTouchDist = 0;
      } else if (e.touches.length === 1) {
        // Went from 2 fingers to 1: restart pan
        const pos = this.getTouchPos(e.touches[0]);
        this.panHandler?.onPointerDown(pos);
      }
    };

    const onWindowResize = () => this.invalidateRect();
    const onElementScroll = () => this.invalidateRect();

    // Attach all — mouseup on document so we catch it even if cursor leaves the chart
    this.element.addEventListener('mousedown', onMouseDown);
    this.element.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    this.element.addEventListener('mouseleave', onMouseLeave);
    this.element.addEventListener('dblclick', onDblClick);
    this.element.addEventListener('wheel', onWheel, { passive: false });
    this.element.addEventListener('contextmenu', onContextMenu);
    this.element.addEventListener('touchstart', onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', onTouchMove, { passive: false });
    this.element.addEventListener('touchend', onTouchEnd);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onWindowResize);
    this.element.addEventListener('scroll', onElementScroll, { passive: true });

    this.boundHandlers.push(
      () => this.element.removeEventListener('mousedown', onMouseDown),
      () => this.element.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('mouseup', onMouseUp),
      () => this.element.removeEventListener('mouseleave', onMouseLeave),
      () => this.element.removeEventListener('dblclick', onDblClick),
      () => this.element.removeEventListener('wheel', onWheel),
      () => this.element.removeEventListener('contextmenu', onContextMenu),
      () => this.element.removeEventListener('touchstart', onTouchStart),
      () => this.element.removeEventListener('touchmove', onTouchMove),
      () => this.element.removeEventListener('touchend', onTouchEnd),
      () => document.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('resize', onWindowResize),
      () => this.element.removeEventListener('scroll', onElementScroll),
    );
  }

  detach(): void {
    for (const remove of this.boundHandlers) remove();
    this.boundHandlers = [];
    this.cachedRect = null;
    this.clearLongPress();
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /** Force the cached bounding rect to be re-read on next access. */
  invalidateRect(): void {
    this.cachedRect = null;
  }

  private getRect(): DOMRect {
    if (!this.cachedRect) {
      this.cachedRect = this.element.getBoundingClientRect();
    }
    return this.cachedRect;
  }

  private getMousePos(e: MouseEvent): Point {
    const rect = this.getRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private getTouchPos(touch: Touch): Point {
    const rect = this.getRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  private getTouchDistance(a: Touch, b: Touch): number {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  private getTouchMidpoint(a: Touch, b: Touch): Point {
    const rect = this.getRect();
    return {
      x: (a.clientX + b.clientX) / 2 - rect.left,
      y: (a.clientY + b.clientY) / 2 - rect.top,
    };
  }
}
