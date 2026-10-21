import type { Point, Rect, ViewportState } from '@tradecanvas/commons';
import type { PanHandler } from './PanHandler.js';
import type { ZoomHandler } from './ZoomHandler.js';
import type { CrosshairHandler } from './CrosshairHandler.js';
import type { AxisDragHandler } from './AxisDragHandler.js';
import type { AlertDragHandler } from './AlertDragHandler.js';
import type { DrawingManager } from '../drawings/DrawingManager.js';
import type { TradingManager } from '../trading/TradingManager.js';
import type { PaneResizeHandler } from './PaneResizeHandler.js';
import type { PriceAxisAddButton } from './PriceAxisAddButton.js';
import { TOUCH_REACH, type PointerKind } from './pointerReach.js';
import { TapTracker } from './TapTracker.js';

/** Every attached chart, and the one pressed last: drawing shortcuts go to one chart. */
const attachedCharts = new Set<HTMLElement>();
let lastPressedChart: HTMLElement | null = null;

/** Where the axis strips are around the plot. */
export interface AxisStrips {
  /** The price pane's plot; its axis strip is to the right of it. */
  plot: Rect;
  /** Top of the time axis: below the price pane and every pane under it. */
  timeAxisTop: number;
  /** The left price scale's strip, which ends at the plot's left edge. */
  left: {
    /** Its width; 0 while it is hidden. */
    width: number;
    /** Whether a drag there scales the price range (it mirrors the price scale). */
    scales: boolean;
  };
}

/** How far, px, a press may drift and still be a click. */
const MOUSE_CLICK_SLOP_PX = 4;
/** How far, px, a finger may drift and still tap (or long-press). */
const TOUCH_SLOP_PX = 8;
/** How long, ms, a finger held still pins the tooltip. */
const LONG_PRESS_MS = 500;
/** How long, ms, after a touch the browser's own menu (a long press) stays shut. */
const TOUCH_MENU_GUARD_MS = 800;

/** The keys held with a press. */
interface PressMods { ctrl: boolean; shift: boolean; alt: boolean }
const NO_MODS: PressMods = { ctrl: false, shift: false, alt: false };

/**
 * What took a press: a part of the chart (`taken`), a drawing grabbed to
 * move or reshape (`drawing`), the "+" menu (`menu`), nothing, so it pans
 * (`pan`), or an axis strip that scales nothing (`inert`).
 */
type PressResult = 'taken' | 'drawing' | 'menu' | 'pan' | 'inert';

/** Where on the chart a point is, for a menu that depends on it. */
export type ChartArea = 'plot' | 'pane' | 'priceAxis' | 'timeAxis';

/** Whether focus is in a dialog or menu, whose keys are its own. */
function focusInOverlay(): boolean {
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  return active instanceof Element && active.closest('[aria-modal="true"], [role="dialog"], [role="menu"]') !== null;
}

export class InteractionManager {
  private panHandler: PanHandler | null = null;
  private zoomHandler: ZoomHandler | null = null;
  private crosshairHandler: CrosshairHandler | null = null;
  private axisDragHandler: AxisDragHandler | null = null;
  private alertDragHandler: AlertDragHandler | null = null;
  private axisViewportGetter: (() => ViewportState) | null = null;
  private onAxisDoubleClick: ((axis: 'price' | 'time') => void) | null = null;
  private onDrawingDoubleClick: ((id: string) => void) | null = null;
  private onDrawingContextMenu: ((id: string, pos: Point) => void) | null = null;
  /** The zoom-area tool: a drag draws the box to zoom into. */
  private zoomArea = false;
  /** The host's menu for a right-click off any drawing; true when it took it. */
  private onChartContextMenu: ((area: ChartArea, pos: Point) => boolean) | null = null;
  /** The "+" by the price axis, and what a click on it does. */
  private priceAxisAdd: { button: PriceAxisAddButton; onClick: (pos: Point) => void } | null = null;
  private axisStrips: (() => AxisStrips) | null = null;
  private savedTouchAction = '';
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
  /** Signal markers: the one under a point, and who hears when the hovered one changes. */
  private markerAt: ((pos: Point) => unknown | null) | null = null;
  private onMarkerHover: ((marker: unknown | null, pos: Point) => void) | null = null;
  private markerClickable: () => boolean = () => true;
  /** Where the pointer was over the hovered marker. */
  private markerPos: Point = { x: 0, y: 0 };
  private hoveredMarker: unknown | null = null;
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
  private longPressed = false;
  /** The finger's press fell through to a pan (nothing took it). */
  private touchFallthrough = false;
  /** Whose the first move made the gesture has been decided (where the page pans too). */
  private touchDecided = false;
  /** The page took this touch (a scroll): the chart lets it be until the finger lifts. */
  private touchYielded = false;
  private taps = new TapTracker();
  /** Vertical swipes and the plain wheel scroll the page (see `setPageScroll`). */
  private pageScroll = false;
  /** The touch's start was the chart's (prevented): no mouse events follow it anyway. */
  private touchStartPrevented = false;
  /** When a finger was last on the chart (the browser's own long-press menu follows it). */
  private lastTouchAt = -Infinity;
  /** The press placed a point of a drawing being made. */
  private pressPlacedPoint = false;

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

  setPanHandler(handler: PanHandler): void { this.panHandler = handler; this.refreshTouchAction(); }
  setZoomHandler(handler: ZoomHandler): void { this.zoomHandler = handler; this.refreshTouchAction(); }
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

  /**
   * Markers that react to the pointer: word of the one hovered (null when the
   * pointer leaves it), and a hand over them while `clickable()` says a click
   * on one does something.
   */
  setSignalMarkerHitTest(
    markerAt: ((pos: Point) => unknown | null) | null,
    onHover: ((marker: unknown | null, pos: Point) => void) | null,
    clickable: () => boolean = () => true,
  ): void {
    this.markerAt = markerAt;
    this.onMarkerHover = onHover;
    this.markerClickable = clickable;
    if (!markerAt) this.hoveredMarker = null;
  }

  /** Leave the hovered marker (the pointer left, or a press started). */
  private leaveMarker(): void {
    if (this.hoveredMarker === null) return;
    this.hoveredMarker = null;
    this.onMarkerHover?.(null, this.markerPos);
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

  /**
   * Called for a right-click that no drawing or trading menu took, with where
   * it was; return true to keep the browser's own menu shut.
   */
  setChartContextMenu(cb: ((area: ChartArea, pos: Point) => boolean) | null): void {
    this.onChartContextMenu = cb;
  }

  /** The "+" by the price axis: a click on it (not while placing something) calls `onClick`. */
  setPriceAxisAddButton(button: PriceAxisAddButton, onClick: (pos: Point) => void): void {
    this.priceAxisAdd = { button, onClick };
  }

  /** While on, a plain drag draws a box (the box-select handlers get it) instead of panning. */
  setZoomAreaMode(on: boolean): void {
    this.zoomArea = on;
  }

  /** Called when a drawing is right-clicked (to open its menu); the browser's menu stays shut. */
  setDrawingContextMenu(cb: (id: string, pos: Point) => void): void {
    this.onDrawingContextMenu = cb;
  }

  /** Called with a drawing's id when it is double-clicked (to open its settings, say). */
  setDrawingDoubleClick(cb: (id: string) => void): void {
    this.onDrawingDoubleClick = cb;
  }

  /** Enable dragging price-alert lines. Hit-tested after trading/drawing. */
  setAlertDragHandler(handler: AlertDragHandler): void {
    this.alertDragHandler = handler;
  }

  setTradingManager(manager: TradingManager, viewportGetter: () => ViewportState): void {
    this.tradingManager = manager;
    this.viewportGetter = viewportGetter;
  }

  /**
   * The time axis below the panes, and the left price scale's strip. Presses
   * on a strip that scales nothing (beside a pane, or a left scale carrying
   * overlays) never draw or pan; a left scale that mirrors the price scale
   * drags and resets like the price axis.
   */
  setAxisStrips(getter: () => AxisStrips): void {
    this.axisStrips = getter;
  }

  /** Enable dragging pane dividers to resize indicator panels. */
  setPaneResizeHandler(handler: PaneResizeHandler): void {
    this.paneResizeHandler = handler;
  }

  /**
   * For a chart on a page that scrolls: a one-finger vertical swipe and the
   * plain mouse wheel scroll the page; a sideways swipe pans the chart, two
   * fingers or Ctrl + wheel (a trackpad pinch) zoom it. Presses on drawings,
   * lines and axes stay the chart's.
   */
  setPageScroll(on: boolean): void {
    this.pageScroll = on;
    this.refreshTouchAction();
  }

  private refreshTouchAction(): void {
    if (attachedCharts.has(this.element)) this.element.style.setProperty('touch-action', this.touchAction());
  }

  /** Which one-finger pans (and pinch) the page keeps on the chart: those the chart doesn't use. */
  private pageTakes(): { x: boolean; y: boolean; zoom: boolean; any: boolean } {
    const x = !this.panHandler;
    const y = this.pageScroll || !this.panHandler;
    return { x, y, zoom: !this.zoomHandler, any: x || y };
  }

  /** `touch-action` for the chart: the browser pans and zooms only where the page keeps the gesture. */
  private touchAction(): string {
    const page = this.pageTakes();
    if (page.x && page.y && page.zoom) return 'manipulation';
    const allowed = [page.x && 'pan-x', page.y && 'pan-y', page.zoom && 'pinch-zoom'].filter(Boolean);
    return allowed.length > 0 ? allowed.join(' ') : 'none';
  }

  attach(): void {
    const getVP = () => this.viewportGetter?.() ?? null;
    attachedCharts.add(this.element);
    // The chart handles its own touch gestures: no page pinch-zoom or
    // scrolling starts on it, save those it leaves to the page.
    this.savedTouchAction = this.element.style.getPropertyValue('touch-action');
    this.element.style.setProperty('touch-action', this.touchAction());

    // Axis hit-test: returns 'price' if pointer is in the price pane's axis
    // strip (right, or a left one that mirrors it), 'time' if in the bottom
    // time-axis strip, 'inert' on a strip that scales nothing (beside a pane,
    // or a left scale carrying overlays), null otherwise.
    const hitAxis = (pos: Point): 'price' | 'time' | 'inert' | null => {
      const strips = this.axisStrips?.() ?? null;
      const r = strips?.plot ?? this.axisViewportGetter?.()?.chartRect;
      if (!r) return null;
      const scales = this.axisDragHandler !== null;
      // Bottom strip wins if we're in the corner — clicking the corner is
      // ambiguous, but bottom is the rarer / less-disruptive default.
      if (pos.y > (strips?.timeAxisTop ?? r.y + r.height)) return scales ? 'time' : null;
      const besidePricePane = pos.y >= r.y && pos.y <= r.y + r.height;
      if (pos.x > r.x + r.width) {
        if (!besidePricePane) return 'inert'; // a pane's own value axis
        return scales ? 'price' : null;
      }
      const left = strips?.left;
      if (left && left.width > 0 && pos.x < r.x && pos.x >= r.x - left.width) {
        return besidePricePane && left.scales && scales ? 'price' : 'inert';
      }
      return null;
    };

    /** Where a point is: the price pane, another pane, the price axis or the time axis. */
    const areaAt = (pos: Point): ChartArea => {
      const strips = this.axisStrips?.() ?? null;
      const r = strips?.plot ?? this.axisViewportGetter?.()?.chartRect;
      if (!r) return 'plot';
      if (pos.y > (strips?.timeAxisTop ?? r.y + r.height)) return 'timeAxis';
      const besidePricePane = pos.y >= r.y && pos.y <= r.y + r.height;
      const left = strips?.left;
      const onLeftAxis = !!left && left.width > 0 && pos.x < r.x && pos.x >= r.x - left.width;
      if (pos.x > r.x + r.width || onLeftAxis) return besidePricePane ? 'priceAxis' : 'pane';
      return besidePricePane ? 'plot' : 'pane';
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

    const idleCursor = (): string => {
      if (this.zoomArea) return 'zoom-in';
      return this.crosshairHandler && this.crosshairHandler.getMode() !== 'hidden' ? 'crosshair' : '';
    };

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
      if (axis === 'inert') return 'default';
      const paneCursor = this.paneResizeHandler?.cursorAt(pos);
      if (paneCursor) return paneCursor;
      if (this.alertDragHandler?.isOverAlert(pos)) return 'ns-resize';
      const vp = getVP();
      if (this.tradingManager?.isOverButton(pos)) return 'pointer';
      if (vp && this.tradingManager?.isOverDraggableLine(pos, vp)) return 'ns-resize';
      // The zoom tool keeps its cursor over drawings too.
      if (this.zoomArea) return 'zoom-in';
      const drawingCursor = vp ? this.drawingManager?.hoverCursorAt(pos, vp) : null;
      if (drawingCursor) return drawingCursor;
      if (vp && this.priceAxisAdd?.button.hit(pos, vp)) return 'pointer';
      return idleCursor();
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
      this.leaveMarker();
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

    // HTML controls layered inside the chart (indicator legend, replay bar,
    // overlays) own the presses, taps and moves on them: no chart gesture,
    // no crosshair move, and no preventDefault that would swallow a tap's click.
    const onChartSurface = (target: EventTarget | null) => target === this.element || target instanceof HTMLCanvasElement;

    /**
     * A press at `pos`, by mouse or finger: the first part of the chart that
     * wants it takes it (axes, a pane divider, a selection box, the measure
     * ruler, the "+" by the price axis, trading lines, drawings, alert lines),
     * else it pans and may be a click. A finger reaches further.
     */
    const press = (pos: Point, mods: PressMods, kind: PointerKind): PressResult => {
      // Any new gesture stops coasting from a previous flick.
      this.panHandler?.cancelMomentum();
      const vp = getVP();
      // A finger reaches further; each part keeps its own reach for the mouse.
      const mouse = kind === 'mouse';
      const reach = mouse ? undefined : TOUCH_REACH;
      this.pressPlacedPoint = false;

      // Click tracking — only a press that falls through to pan (i.e. an empty
      // chart-area press) and is released without drag counts as a click.
      this.downPos = pos;
      this.downMoved = false;
      this.pressForClick = false;

      // Axis drag has priority — clicking the price/time strip should never
      // start drawing or open the trading menu.
      const axis = hitAxis(pos);
      if (axis === 'inert') return 'inert';
      if (axis && this.axisDragHandler) {
        this.axisDragHandler.begin(axis, pos);
        return 'taken';
      }

      // Pane divider drag — resize indicator panes. Checked early (after the
      // axis strips) so a divider press never starts drawing or trading.
      if (this.paneResizeHandler?.tryBegin(pos, reach?.divider)) return 'taken';

      // Ctrl/⌘-drag: selection box — select every drawing it covers;
      // a plain Ctrl/⌘-click adds or removes the drawing under the pointer.
      const placing = !!this.drawingManager?.getActiveTool()
        || !!this.tradingManager?.isBracketActive()
        || !!this.tradingManager?.isOrderDraftActive();
      // The zoom-area tool takes a plain drag for its box (before anything being placed).
      if (this.boxSelectHandlers && (this.zoomArea || (mods.ctrl && !placing))) {
        this.boxSelecting = true;
        this.boxSelectHandlers.begin(pos);
        if (mouse) setCursor(idleCursor());
        this.onOverlayDirty?.(true);
        return 'taken';
      }

      // Shift-drag measure tool — bypasses pan/draw/trade. Tracked separately
      // because the gesture spans the press and its release, and the crosshair
      // is suppressed while measuring.
      if (mods.shift && this.measureHandlers) {
        this.measuring = true;
        this.measureHandlers.begin(pos);
        this.onOverlayDirty?.(true);
        return 'taken';
      }

      // Alt/Option-click pins the OHLC tooltip at the hovered bar. Pure
      // discrete action, doesn't enter any drag state.
      if (mods.alt && this.onAltClick) {
        this.onAltClick(pos);
        return 'taken';
      }

      // The "+" by the price axis offers what to do at that price, unless a
      // line, an alert or a drawing is under the pointer (as the cursor says).
      if (
        this.priceAxisAdd && vp && !placing && this.priceAxisAdd.button.hit(pos, vp)
        && !this.alertDragHandler?.isOverAlert(pos)
        && !this.tradingManager?.isOverButton(pos)
        && !this.tradingManager?.isOverDraggableLine(pos, vp)
        && !this.drawingManager?.hoverCursorAt(pos, vp)
      ) {
        this.priceAxisAdd.onClick(pos);
        return 'menu';
      }

      if (this.tradingManager && vp && this.tradingManager.onPointerDown(pos, vp, reach)) {
        if (mouse) setCursor(this.tradingManager.isOverButton(pos) ? 'pointer' : 'ns-resize');
        return 'taken';
      }
      if (this.drawingManager && vp && this.drawingManager.onPointerDown(pos, vp, reach)) {
        if (mouse && this.drawingManager.isDragging()) setCursor('grabbing');
        this.pressPlacedPoint = !!this.drawingManager.getActiveTool();
        // Placing a point or erasing isn't holding a drawing (no menu on a long press).
        return placing || this.drawingManager.isEraser() ? 'taken' : 'drawing';
      }
      // Alert lines are draggable — precise hit-test (a few px), so this only
      // claims the gesture when the pointer is right on a line.
      if (this.alertDragHandler?.tryBegin(pos, reach?.alert)) {
        this.onOverlayDirty?.();
        return 'taken';
      }
      this.pressForClick = true;
      if (this.panHandler) {
        this.panHandler.onPointerDown(pos);
        if (mouse) setCursor('grabbing');
      }
      return 'pan';
    };

    const onMouseDown = (e: MouseEvent) => {
      lastPressedChart = this.element;
      // Only the primary button starts gestures; right-click belongs to the
      // context menu and must not start a pan underneath it.
      if (e.button !== 0) return;
      if (!onChartSurface(e.target)) return;
      beginPress();
      // Cheap refresh point — ensures the rect is current for the
      // interaction that follows (drag, pan, draw, etc.).
      this.invalidateRect();
      const mods = { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey };
      // Keep focus where the "+" menu puts it.
      if (press(this.getMousePos(e), mods, 'mouse') === 'menu') e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      // During a press the document listener handles every move (this event
      // bubbles there too) — don't process it twice.
      if (pressActive) return;
      // Over a layered control the crosshair stays put. This also ignores the
      // mousemove a browser sends after a tap on one, which would otherwise
      // leave a crosshair behind that no mouseleave clears.
      if (!onChartSurface(e.target)) {
        this.leaveMarker(); // onto the legend or a bar laid over the chart
        return;
      }
      handleMove(e);
    };

    const handleMove = (e: MouseEvent) => {
      const pos = this.getMousePos(e);
      // Hover cursor and markers — only between gestures; a press keeps the
      // cursor it started with (grabbing hand while panning, etc.).
      if (!pressActive) {
        const marker = this.markerAt?.(pos) ?? null;
        if (marker !== this.hoveredMarker) {
          this.hoveredMarker = marker;
          this.onMarkerHover?.(marker, pos);
        }
        if (marker) this.markerPos = pos;
        setCursor(marker && this.markerClickable() ? 'pointer' : hoverCursor(pos));
      }
      moveTo(pos, 'mouse', pressActive);
    };

    /**
     * The pointer moved to `pos`, `held` down or not: whatever the press
     * started follows it (a drag, a box, the ruler, a drawing), else the
     * chart pans and the crosshair follows.
     */
    const moveTo = (pos: Point, kind: PointerKind, held: boolean, panAt: Point = pos) => {
      const vp = getVP();

      // A pending click (or tap) ends once the pointer drifts past the slop.
      if (this.downPos && !this.downMoved) {
        const slop = kind === 'mouse' ? MOUSE_CLICK_SLOP_PX : TOUCH_SLOP_PX;
        if (Math.hypot(pos.x - this.downPos.x, pos.y - this.downPos.y) > slop) this.downMoved = true;
      }

      // Axis drag in progress — owns the gesture exclusively.
      if (this.axisDragHandler?.isActive()) {
        this.axisDragHandler.move(pos);
        if (kind === 'touch') this.onOverlayDirty?.();
        return;
      }

      // Pane resize in progress — owns the gesture exclusively.
      if (this.paneResizeHandler?.isActive()) {
        this.paneResizeHandler.move(pos);
        if (kind === 'touch') this.onOverlayDirty?.();
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

      if (this.tradingManager && vp && this.tradingManager.onPointerMove(held ? clampToPlot(pos) : pos, vp)) {
        this.crosshairHandler?.onPointerMove(pos);
        this.onOverlayDirty?.();
        return;
      }
      if (this.drawingManager && vp && this.drawingManager.onPointerMove(pos, vp)) {
        this.crosshairHandler?.onPointerMove(pos);
        this.onOverlayDirty?.();
        return;
      }
      this.panHandler?.onPointerMove(panAt);
      this.crosshairHandler?.onPointerMove(pos);
      // Hover-only unless a press is panning the chart.
      this.onOverlayDirty?.(!held);
    };

    /**
     * The press ends at `pos` (null when the browser took a touch back):
     * whatever it started finishes. `cancelled` ends it without a click, a
     * point placed or a coast. True when it was a click.
     */
    const release = (pos: Point | null, kind: PointerKind, cancelled = false): boolean => {
      const clickAt = this.downPos;
      const moved = this.downMoved && clickAt !== null;
      const placed = this.pressPlacedPoint;
      const wasClick = this.pressForClick && !this.downMoved && clickAt !== null && !cancelled;
      this.pressForClick = false;
      this.pressPlacedPoint = false;
      this.downPos = null;
      this.downMoved = false;
      if (this.boxSelecting && this.boxSelectHandlers) {
        this.boxSelecting = false;
        if (cancelled) this.boxSelectHandlers.cancel();
        else this.boxSelectHandlers.end();
        this.onOverlayDirty?.(true);
        return false;
      }
      if (this.axisDragHandler?.isActive()) {
        this.axisDragHandler.end();
        return false;
      }
      if (this.paneResizeHandler?.isActive()) {
        this.paneResizeHandler.end();
        return false;
      }
      if (this.alertDragHandler?.isActive()) {
        this.alertDragHandler.end();
        this.onOverlayDirty?.();
        return false;
      }
      if (this.measuring && this.measureHandlers) {
        this.measuring = false;
        this.measureHandlers.end();
        this.onOverlayDirty?.(true);
        return false;
      }
      // Called off, a dragged trading line goes back and nothing is reported.
      if (cancelled ? this.tradingManager?.cancelPointer() : this.tradingManager?.onPointerUp(pos ?? undefined)) return false;
      // A finger dragged from a drawing's point lifts where the next one goes:
      // press, drag, lift draws a line, as two taps do. Called off (the start
      // of a pinch), the point it placed is taken back.
      const vp = getVP();
      if (cancelled && placed) this.drawingManager?.takeBackPoint();
      if (kind === 'touch' && moved && !cancelled && pos && vp) this.drawingManager?.placeAt(pos, vp);
      if (this.drawingManager?.onPointerUp()) return false;
      this.panHandler?.onPointerUp();
      if (cancelled) this.panHandler?.cancelMomentum();

      // A press that fell through to pan and was released without drifting is a
      // chart click.
      if (wasClick && this.onClick) this.onClick(clickAt);
      return wasClick;
    };

    /** A double-click or double tap at `pos`: an axis resets; a drawing opens (within `reach` px, a finger's). */
    const doubleAt = (pos: Point, reach?: number) => {
      const axis = hitAxis(pos);
      if (axis) {
        if (axis !== 'inert') this.onAxisDoubleClick?.(axis);
        return;
      }
      const vp = getVP();
      // The double-click that finished a drawing (a path) doesn't open it.
      if (!vp || this.drawingManager?.justFinished()) return;
      const id = this.drawingManager?.drawingAt(pos, vp, reach);
      if (id) this.onDrawingDoubleClick?.(id);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0 && e.type === 'mouseup') return;
      if (!pressActive) return;
      endPress();
      const pos = this.getMousePos(e);
      // Back to the hover cursor for wherever the pointer was released.
      setCursor(hoverCursor(pos));
      release(pos, 'mouse');
    };

    const onDblClick = (e: MouseEvent) => {
      doubleAt(this.getMousePos(e));
    };

    const onMouseLeave = () => {
      this.leaveMarker();
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
      // Nothing to zoom, or a page that scrolls under a plain wheel: the page's.
      if (!this.zoomHandler) return;
      if (this.pageScroll && !e.ctrlKey) return;
      e.preventDefault();
      const pos = this.getMousePos(e);
      this.zoomHandler.onWheel(e.deltaY, pos);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Keys pressed in a dialog or menu (a drawing's settings, say) are its own.
      if (focusInOverlay()) return;
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
      // Drawing shortcuts (copy/paste, undo/redo, delete) go to one chart, and
      // never to a text field being typed in. Escape still cancels a tool
      // picked from outside the chart.
      if (e.key !== 'Escape' && !this.ownsShortcuts()) return;
      if (this.drawingManager?.onKeyDown(e.key, e.ctrlKey || e.metaKey, e.shiftKey)) e.preventDefault();
    };

    const onContextMenu = (e: MouseEvent) => {
      // A long press opens the browser's menu on some phones: a finger's
      // long press is the chart's (it pins the tooltip, or a drawing's menu).
      if (this.touchActive || Date.now() - this.lastTouchAt < TOUCH_MENU_GUARD_MS) {
        e.preventDefault();
        return;
      }
      const vp = getVP();
      if (!vp) return;
      const pos = this.getMousePos(e);
      // A drawing under the pointer has a menu of its own: in the price pane,
      // not on an axis or another pane, and not while a tool is drawing.
      const plot = vp.chartRect;
      const inPlot = pos.x >= plot.x && pos.x <= plot.x + plot.width && pos.y >= plot.y && pos.y <= plot.y + plot.height;
      const drawingId = this.onDrawingContextMenu && inPlot && !this.drawingManager?.getActiveTool()
        ? this.drawingManager?.drawingAt(pos, vp)
        : null;
      if (drawingId) {
        e.preventDefault();
        this.onDrawingContextMenu?.(drawingId, pos);
        return;
      }
      // The trading menu (when it is on), else the host's menu for where it was.
      // The browser's own menu stays only when neither took the click.
      if (this.tradingManager?.onContextMenu(pos, vp)) {
        e.preventDefault();
        return;
      }
      if (this.onChartContextMenu?.(areaAt(pos), pos)) e.preventDefault();
    };

    // --- Touch events ---
    // One finger does what the mouse does: the same press, move and release,
    // with a finger's reach; a tap is a click, a double tap a double-click, a
    // long press pins the tooltip. Two fingers pinch and pan. A gesture starts
    // on the chart surface; a second finger may then land anywhere (on the
    // legend, say) and still pinch.
    const onTouchStart = (e: TouchEvent) => {
      lastPressedChart = this.element;
      if (!this.touchActive && !onChartSurface(e.target)) return;
      this.lastTouchAt = Date.now();
      this.invalidateRect();
      if (e.touches.length === 1) {
        const pos = this.getTouchPos(e.touches[0]);
        this.touchStartPos = pos;
        this.longPressed = false;
        this.touchYielded = false;
        this.touchDecided = false;
        const result = press(pos, NO_MODS, 'touch');
        this.touchActive = true;
        // A press nothing took pans: where the page pans too (`pageScroll`,
        // or a chart that doesn't pan), the first move decides whose it is.
        // ('inert': an axis strip that scales nothing is a press nothing took.)
        this.touchFallthrough = result === 'pan' || result === 'inert';
        this.touchStartPrevented = !(this.touchFallthrough && this.pageTakes().any);
        if (this.touchStartPrevented) e.preventDefault();
        if (result === 'drawing') {
          holdForDrawingMenu(pos);
          return;
        }
        if (result !== 'pan') return;

        // Long-press to pin the OHLC tooltip — mobile equivalent of Alt+click.
        // Cancelled by movement > threshold or by a second finger landing.
        if (this.onAltClick) {
          this.clearLongPress();
          this.longPressTimer = setTimeout(() => {
            this.longPressTimer = null;
            this.longPressed = true;
            this.pressForClick = false;
            this.onAltClick?.(pos);
            // Stop the pan gesture that started under the press so it doesn't
            // suddenly jolt the chart when the user lifts their finger.
            this.panHandler?.onPointerUp();
            this.panHandler?.cancelMomentum();
            this.onOverlayDirty?.(true);
          }, LONG_PRESS_MS);
        }
        this.crosshairHandler?.onPointerMove(pos);
        this.onOverlayDirty?.(true);
      } else if (e.touches.length === 2) {
        // Two fingers: whatever one finger started ends, and a pinch begins.
        this.clearLongPress();
        if (this.touchActive && !this.touchYielded && this.lastTouchDist === 0) release(null, 'touch', true);
        if (!this.zoomHandler && !this.panHandler) {
          // Nothing to pinch: the page zooms.
          this.touchActive = false;
          return;
        }
        if (e.cancelable) e.preventDefault();
        this.lastTouchDist = this.getTouchDistance(e.touches[0], e.touches[1]);
        this.lastTouchMid = this.getTouchMidpoint(e.touches[0], e.touches[1]);
        this.touchActive = true;
        this.touchYielded = false;
      }
    };

    /**
     * A finger held still on a drawing opens its menu, as a right-click does:
     * the drag it started is let go, and the gesture ends there.
     */
    const holdForDrawingMenu = (pos: Point) => {
      if (!this.onDrawingContextMenu) return;
      this.clearLongPress();
      this.longPressTimer = setTimeout(() => {
        this.longPressTimer = null;
        const vp = getVP();
        const id = vp ? this.drawingManager?.drawingAt(pos, vp, TOUCH_REACH.line) : null;
        if (!id) return;
        release(null, 'touch', true);
        this.longPressed = true;
        this.touchYielded = true;
        this.crosshairHandler?.onPointerLeave();
        this.onDrawingContextMenu?.(id, pos);
        this.onOverlayDirty?.();
      }, LONG_PRESS_MS);
    };

    /**
     * The first move of a one-finger pan where the page pans too: mostly
     * along an axis the page takes, the gesture is the page's (true).
     */
    const yieldsToPage = (pos: Point): boolean => {
      if (this.touchDecided) return false;
      const dx = pos.x - this.touchStartPos.x;
      const dy = pos.y - this.touchStartPos.y;
      if (Math.hypot(dx, dy) <= TOUCH_SLOP_PX) return false;
      this.touchDecided = true;
      const page = this.pageTakes();
      return Math.abs(dy) >= Math.abs(dx) ? page.y : page.x;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.touchActive || this.touchYielded) return;
      if (e.touches.length === 1) {
        const pos = this.getTouchPos(e.touches[0]);
        if (this.lastTouchDist > 0) {
          // The finger left after a pinch pans (sideways only with `pageScroll`).
          if (e.cancelable) e.preventDefault();
          this.panHandler?.onPointerMove(this.pageScroll ? { x: pos.x, y: this.touchStartPos.y } : pos);
          this.onOverlayDirty?.();
          return;
        }

        // Cancel long-press if the finger drifts past the slop threshold.
        if (this.longPressTimer && Math.hypot(pos.x - this.touchStartPos.x, pos.y - this.touchStartPos.y) > TOUCH_SLOP_PX) {
          this.clearLongPress();
        }
        if (this.touchFallthrough && this.pageTakes().any) {
          if (!this.touchDecided && Math.hypot(pos.x - this.touchStartPos.x, pos.y - this.touchStartPos.y) <= TOUCH_SLOP_PX) return;
          if (yieldsToPage(pos)) {
            // The page scrolls: the chart lets the gesture go.
            this.touchYielded = true;
            release(null, 'touch', true);
            this.crosshairHandler?.onPointerLeave();
            this.onOverlayDirty?.(true);
            return;
          }
        }
        if (e.cancelable) e.preventDefault();
        // With the page scrolling vertically, the chart pans sideways only.
        const panAt = this.pageScroll ? { x: pos.x, y: this.touchStartPos.y } : pos;
        moveTo(pos, 'touch', true, panAt);
      } else if (e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const dist = this.getTouchDistance(e.touches[0], e.touches[1]);
        const mid = this.getTouchMidpoint(e.touches[0], e.touches[1]);

        // Pinch zoom: the bars scale with the distance between the fingers.
        if (this.lastTouchDist > 0 && dist > 0) {
          this.zoomHandler?.onPinch(dist / this.lastTouchDist, mid);
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
        // A finger on the chart pans or zooms it: the scene changes.
        this.onOverlayDirty?.();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      this.clearLongPress();
      if (!this.touchActive) return;
      this.lastTouchAt = Date.now();
      if (e.touches.length === 0) {
        const lifted = e.changedTouches?.[0];
        const pos = lifted ? this.getTouchPos(lifted) : null;
        const pinched = this.lastTouchDist > 0;
        const tapped = !pinched && !this.longPressed && !this.touchYielded && this.downPos !== null && !this.downMoved;
        if (!this.touchYielded) {
          if (pinched) {
            this.panHandler?.onPointerUp();
          } else {
            release(pos, 'touch');
          }
          // Ours: no mouse events made up from the touch after it (a start
          // already prevented has none to stop).
          if (!this.touchStartPrevented && e.cancelable) e.preventDefault();
        }
        if (tapped && pos && this.taps.tap(pos)) doubleAt(pos, TOUCH_REACH.line);
        else if (!tapped) this.taps.reset();
        this.crosshairHandler?.onPointerLeave();
        this.touchActive = false;
        this.touchYielded = false;
        this.lastTouchDist = 0;
        this.onOverlayDirty?.();
      } else if (e.touches.length === 1 && !this.touchYielded) {
        // Went from 2 fingers to 1: restart pan
        const pos = this.getTouchPos(e.touches[0]);
        this.touchStartPos = pos;
        this.panHandler?.onPointerDown(pos);
      } else if (e.touches.length === 2 && this.lastTouchDist > 0) {
        // A third finger lifted: measure the pinch from the two left.
        this.lastTouchDist = this.getTouchDistance(e.touches[0], e.touches[1]);
        this.lastTouchMid = this.getTouchMidpoint(e.touches[0], e.touches[1]);
      }
    };

    /** The browser took the touch back (a page scroll, a system gesture): end it, no click. */
    const onTouchCancel = () => {
      this.clearLongPress();
      if (!this.touchActive) return;
      this.lastTouchAt = Date.now();
      if (!this.touchYielded) {
        if (this.lastTouchDist > 0) {
          this.panHandler?.onPointerUp();
          this.panHandler?.cancelMomentum();
        } else {
          release(null, 'touch', true);
        }
      }
      this.taps.reset();
      this.crosshairHandler?.onPointerLeave();
      this.touchActive = false;
      this.touchYielded = false;
      this.lastTouchDist = 0;
      this.onOverlayDirty?.();
    };

    // The pointer → chart mapping uses a cached bounding rect. Anything that
    // can move the chart on screen drops it: a window resize, a scroll of the
    // page or of any scrolling ancestor (scroll doesn't bubble, so listen in
    // the capture phase), and the pointer entering (covers layout shifts).
    const onWindowResize = () => this.invalidateRect();
    const onAnyScroll = () => this.invalidateRect();
    const onMouseEnter = () => this.invalidateRect();

    // Quick presses one after another can leave the canvas selected (a
    // double-click selects it), and the next press on it then starts the
    // browser's own drag of that selection: the cursor turns to "no drop" and
    // the chart stops getting moves mid-pan. Such drags are cancelled: one
    // that starts on the chart's surface, or any while a press on it is held.
    const onDragStart = (e: DragEvent) => {
      const onChart = e.target instanceof Node && this.element.contains(e.target) && onChartSurface(e.target);
      if (pressActive || onChart) e.preventDefault();
    };

    // Attach all — mouseup on document so we catch it even if cursor leaves the chart
    this.element.addEventListener('mousedown', onMouseDown);
    this.element.addEventListener('mousemove', onMouseMove);
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('mouseup', onMouseUp);
    this.element.addEventListener('mouseleave', onMouseLeave);
    this.element.addEventListener('dblclick', onDblClick);
    this.element.addEventListener('wheel', onWheel, { passive: false });
    this.element.addEventListener('contextmenu', onContextMenu);
    this.element.addEventListener('touchstart', onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', onTouchMove, { passive: false });
    this.element.addEventListener('touchend', onTouchEnd);
    this.element.addEventListener('touchcancel', onTouchCancel);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('scroll', onAnyScroll, { capture: true, passive: true });
    this.element.addEventListener('mouseenter', onMouseEnter);

    this.boundHandlers.push(
      endPress,
      () => this.element.removeEventListener('mousedown', onMouseDown),
      () => document.removeEventListener('dragstart', onDragStart, true),
      () => this.element.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('mouseup', onMouseUp),
      () => this.element.removeEventListener('mouseleave', onMouseLeave),
      () => this.element.removeEventListener('dblclick', onDblClick),
      () => this.element.removeEventListener('wheel', onWheel),
      () => this.element.removeEventListener('contextmenu', onContextMenu),
      () => this.element.removeEventListener('touchstart', onTouchStart),
      () => this.element.removeEventListener('touchmove', onTouchMove),
      () => this.element.removeEventListener('touchend', onTouchEnd),
      () => this.element.removeEventListener('touchcancel', onTouchCancel),
      () => document.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('resize', onWindowResize),
      () => document.removeEventListener('scroll', onAnyScroll, { capture: true }),
      () => this.element.removeEventListener('mouseenter', onMouseEnter),
    );
  }

  detach(): void {
    attachedCharts.delete(this.element);
    if (this.savedTouchAction) this.element.style.setProperty('touch-action', this.savedTouchAction);
    else this.element.style.removeProperty('touch-action');
    if (lastPressedChart === this.element) lastPressedChart = null;
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

  /**
   * Whether drawing shortcuts are this chart's: not while typing in a text
   * field; the chart holding focus if any does; else the chart pressed last
   * (so clicking a toolbar button beside it keeps them working); else any.
   */
  private ownsShortcuts(): boolean {
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {
      return false;
    }
    for (const chart of attachedCharts) {
      if (active && chart.contains(active)) return chart === this.element;
    }
    return lastPressedChart === null || lastPressedChart === this.element;
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
