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
  private boxSelectHandlers: {
    begin: (pos: Point) => void;
    move: (pos: Point) => void;
    end: () => void;
    cancel: () => void;
  } | null = null;
  private boxSelecting = false;
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
  /** `hoverOnly`: only pointer-tied visuals changed (crosshair, measure ruler, selection box). */
  private onOverlayDirty: ((hoverOnly?: boolean) => void) | null = null;
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

  /**
   * Called when a pointer event changed what's drawn. `hoverOnly` is true when
   * only pointer-tied visuals changed (crosshair, axis pills, measure ruler,
   * selection box) — the chart then redraws just its thin top canvas.
   */
  setOverlayDirtyCallback(cb: (hoverOnly?: boolean) => void): void { this.onOverlayDirty = cb; }

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

  /**
   * Ctrl/⌘-drag selection box: `begin`/`move` track the box, `end` selects
   * what it covers (or toggles the drawing under a plain Ctrl/⌘-click),
   * `cancel` drops it (Escape).
   */
  setBoxSelectHandlers(handlers: {
    begin: (pos: Point) => void;
    move: (pos: Point) => void;
    end: () => void;
    cancel: () => void;
  }): void {
    this.boxSelectHandlers = handlers;
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
    // Price-based drags (trading lines, alerts, brackets) keep following the
    // pointer outside the chart, but the price they take is pinned to the
    // plot's edge — never off-scale or negative.
    const clampToPlot = (pos: Point): Point => {
      const r = (this.viewportGetter?.() ?? this.axisViewportGetter?.())?.chartRect;
      if (!r) return pos;
      return {
        x: Math.max(r.x, Math.min(r.x + r.width, pos.x)),
        y: Math.max(r.y, Math.min(r.y + r.height, pos.y)),
      };
    };

    const idleCursor = (): string =>
      this.crosshairHandler && this.crosshairHandler.getMode() !== 'hidden' ? 'crosshair' : '';

    const setCursor = (cursor: string) => {
      if (this.element.style.cursor !== cursor) this.element.style.cursor = cursor;
    };

    // Cursors: crosshair over the chart, resize arrows on
    // the axes / pane dividers / draggable lines, a hand over drawings, a
    // move cursor over the selected drawing's handles.
    const hoverCursor = (pos: Point): string => {
      const axis = hitAxis(pos);
      if (axis === 'price') return 'ns-resize';
      if (axis === 'time') return 'ew-resize';
      const paneCursor = this.paneResizeHandler?.cursorAt(pos);
      if (paneCursor) return paneCursor;
      if (this.alertDragHandler?.isOverAlert(pos)) return 'ns-resize';
      const vp = getVP();
      if (vp && this.tradingManager?.isOverDraggableLine(pos, vp)) return 'ns-resize';
      const drawingCursor = vp ? this.drawingManager?.hoverCursorAt(pos, vp) : null;
      return drawingCursor ?? idleCursor();
    };

    // While a left button is held, moves are followed on `document`, so a
    // drag that leaves the chart (fast flick, into a side panel, over the
    // toolbar) keeps going instead of dying at the edge.
    let pressActive = false;
    let savedUserSelect = '';
    const onDocMouseMove = (e: MouseEvent) => {
      // Released outside the window: no mouseup reached us — end it here.
      if ((e.buttons & 1) === 0) {
        onMouseUp(e);
        return;
      }
      handleMove(e);
    };
    const beginPress = () => {
      if (pressActive) return;
      pressActive = true;
      savedUserSelect = document.documentElement.style.userSelect;
      document.documentElement.style.userSelect = 'none';
      document.addEventListener('mousemove', onDocMouseMove);
    };
    const endPress = () => {
      if (!pressActive) return;
      pressActive = false;
      document.documentElement.style.userSelect = savedUserSelect;
      document.removeEventListener('mousemove', onDocMouseMove);
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only the primary button starts gestures; right-click belongs to the
      // context menu and must not start a pan underneath it.
      if (e.button !== 0) return;
      // Presses on HTML controls layered inside the chart (replay scrubber,
      // overlays) belong to them, not to a chart gesture.
      if (e.target !== this.element && !(e.target instanceof HTMLCanvasElement)) return;
      // Any new gesture stops coasting from a previous flick.
      this.panHandler?.cancelMomentum();
      beginPress();
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

      // Ctrl/⌘-drag: selection box — select every drawing it covers;
      // a plain Ctrl/⌘-click adds or removes the drawing under the pointer.
      const placing = !!this.drawingManager?.getActiveTool()
        || !!this.tradingManager?.isBracketActive()
        || !!this.tradingManager?.isOrderDraftActive();
      if ((e.ctrlKey || e.metaKey) && this.boxSelectHandlers && !placing) {
        this.boxSelecting = true;
        this.boxSelectHandlers.begin(pos);
        setCursor(idleCursor());
        this.onOverlayDirty?.(true);
        return;
      }

      // Shift-drag measure tool — bypasses pan/draw/trade. Tracked separately
      // because the gesture spans mousedown→mouseup and crosshair should be
      // suppressed while measuring.
      if (e.shiftKey && this.measureHandlers) {
        this.measuring = true;
        this.measureHandlers.begin(pos);
        this.onOverlayDirty?.(true);
        return;
      }

      // Alt/Option-click pins the OHLC tooltip at the hovered bar. Pure
      // discrete action, doesn't enter any drag state.
      if (e.altKey && this.onAltClick) {
        this.onAltClick(pos);
        return;
      }

      if (this.tradingManager && vp && this.tradingManager.onPointerDown(pos, vp)) {
        setCursor('ns-resize');
        return;
      }
      if (this.drawingManager && vp && this.drawingManager.onPointerDown(pos, vp)) {
        if (this.drawingManager.isDragging()) setCursor('grabbing');
        return;
      }
      // Alert lines are draggable — precise hit-test (a few px), so this only
      // claims the gesture when the pointer is right on a line.
      if (this.alertDragHandler?.tryBegin(pos)) {
        this.onOverlayDirty?.();
        return;
      }
      this.pressForClick = true;
      if (this.panHandler) {
        this.panHandler.onPointerDown(pos);
        setCursor('grabbing');
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // During a press the document listener handles every move (this event
      // bubbles there too) — don't process it twice.
      if (pressActive) return;
      handleMove(e);
    };

    const handleMove = (e: MouseEvent) => {
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
        this.alertDragHandler.move(clampToPlot(pos));
        this.onOverlayDirty?.();
        return;
      }

      if (this.measuring && this.measureHandlers) {
        this.measureHandlers.move(pos);
        this.onOverlayDirty?.(true);
        return;
      }

      if (this.boxSelecting && this.boxSelectHandlers) {
        this.boxSelectHandlers.move(pos);
        this.onOverlayDirty?.(true);
        return;
      }

      // Hover cursor — only between gestures; a press keeps the cursor it
      // started with (grabbing hand while panning, etc.).
      if (!pressActive) setCursor(hoverCursor(pos));

      if (this.tradingManager && vp && this.tradingManager.onPointerMove(pressActive ? clampToPlot(pos) : pos, vp)) {
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
      // Hover-only unless a press is panning the chart.
      this.onOverlayDirty?.(!pressActive);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0 && e.type === 'mouseup') return;
      if (!pressActive) return;
      endPress();
      // Back to the hover cursor for wherever the pointer was released.
      setCursor(hoverCursor(this.getMousePos(e)));
      if (this.boxSelecting && this.boxSelectHandlers) {
        this.boxSelecting = false;
        this.boxSelectHandlers.end();
        this.onOverlayDirty?.(true);
        return;
      }
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
        this.onOverlayDirty?.(true);
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
      if (pressActive) {
        // The gesture continues outside (document listener); only the hover
        // crosshair goes away.
        this.crosshairHandler?.onPointerLeave();
        this.onOverlayDirty?.(true);
        return;
      }
      setCursor('');
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
      if (e.key === 'Escape' && this.boxSelecting && this.boxSelectHandlers) {
        this.boxSelecting = false;
        this.boxSelectHandlers.cancel();
        this.onOverlayDirty?.(true);
      }
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
            this.onOverlayDirty?.(true);
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

        // Two-finger pan — horizontal only, so a pinch doesn't also drag the
        // price scale. Feed a point with the anchor's y to zero the vertical delta.
        const dx = this.lastTouchMid.x - mid.x;
        if (Math.abs(dx) > 1) {
          this.panHandler?.onPointerDown(this.lastTouchMid);
          this.panHandler?.onPointerMove({ x: mid.x, y: this.lastTouchMid.y });
        }

        this.lastTouchDist = dist;
        this.lastTouchMid = mid;
      }
      // A finger on the chart pans or zooms it: the scene changes.
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

    // The pointer → chart mapping uses a cached bounding rect. Anything that
    // can move the chart on screen drops it: a window resize, a scroll of the
    // page or of any scrolling ancestor (scroll doesn't bubble, so listen in
    // the capture phase), and the pointer entering (covers layout shifts).
    const onWindowResize = () => this.invalidateRect();
    const onAnyScroll = () => this.invalidateRect();
    const onMouseEnter = () => this.invalidateRect();

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
    document.addEventListener('scroll', onAnyScroll, { capture: true, passive: true });
    this.element.addEventListener('mouseenter', onMouseEnter);

    this.boundHandlers.push(
      endPress,
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
      () => document.removeEventListener('scroll', onAnyScroll, { capture: true }),
      () => this.element.removeEventListener('mouseenter', onMouseEnter),
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
