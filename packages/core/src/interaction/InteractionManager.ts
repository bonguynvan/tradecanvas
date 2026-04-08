import type { Point, ViewportState } from '@chart-lib/commons';
import type { PanHandler } from './PanHandler.js';
import type { ZoomHandler } from './ZoomHandler.js';
import type { CrosshairHandler } from './CrosshairHandler.js';
import type { DrawingManager } from '../drawings/DrawingManager.js';
import type { TradingManager } from '../trading/TradingManager.js';

export class InteractionManager {
  private panHandler: PanHandler | null = null;
  private zoomHandler: ZoomHandler | null = null;
  private crosshairHandler: CrosshairHandler | null = null;
  private drawingManager: DrawingManager | null = null;
  private tradingManager: TradingManager | null = null;
  private viewportGetter: (() => ViewportState) | null = null;
  private onOverlayDirty: (() => void) | null = null;
  private boundHandlers: (() => void)[] = [];

  // Touch state
  private lastTouchDist = 0;
  private lastTouchMid: Point = { x: 0, y: 0 };
  private touchActive = false;

  constructor(private element: HTMLElement) {}

  setOverlayDirtyCallback(cb: () => void): void { this.onOverlayDirty = cb; }

  setPanHandler(handler: PanHandler): void { this.panHandler = handler; }
  setZoomHandler(handler: ZoomHandler): void { this.zoomHandler = handler; }
  setCrosshairHandler(handler: CrosshairHandler): void { this.crosshairHandler = handler; }

  setDrawingManager(manager: DrawingManager, viewportGetter: () => ViewportState): void {
    this.drawingManager = manager;
    this.viewportGetter = viewportGetter;
  }

  setTradingManager(manager: TradingManager, viewportGetter: () => ViewportState): void {
    this.tradingManager = manager;
    this.viewportGetter = viewportGetter;
  }

  attach(): void {
    const getVP = () => this.viewportGetter?.() ?? null;

    // --- Mouse events ---
    const onMouseDown = (e: MouseEvent) => {
      const pos = this.getMousePos(e);
      const vp = getVP();
      if (this.tradingManager && vp && this.tradingManager.onPointerDown(pos, vp)) return;
      if (this.drawingManager && vp && this.drawingManager.onPointerDown(pos, vp)) return;
      this.panHandler?.onPointerDown(pos);
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = this.getMousePos(e);
      const vp = getVP();
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
      if (this.tradingManager?.onPointerUp()) return;
      if (this.drawingManager?.onPointerUp()) return;
      this.panHandler?.onPointerUp();
    };

    const onMouseLeave = () => {
      this.panHandler?.onPointerUp();
      this.drawingManager?.onPointerUp();
      this.tradingManager?.onPointerUp();
      this.crosshairHandler?.onPointerLeave();
      this.onOverlayDirty?.();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pos = this.getMousePos(e);
      this.zoomHandler?.onWheel(e.deltaY, pos);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.drawingManager?.onKeyDown(e.key, e.ctrlKey || e.metaKey)) e.preventDefault();
    };

    const onContextMenu = (e: MouseEvent) => {
      const vp = getVP();
      if (this.tradingManager && vp) {
        e.preventDefault();
        this.tradingManager.onContextMenu(this.getMousePos(e), vp);
      }
    };

    // --- Touch events ---
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        // Single finger: pan
        const pos = this.getTouchPos(e.touches[0]);
        this.panHandler?.onPointerDown(pos);
        this.crosshairHandler?.onPointerMove(pos);
        this.touchActive = true;
      } else if (e.touches.length === 2) {
        // Two fingers: start pinch-to-zoom
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
      if (e.touches.length === 0) {
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

    // Attach all — mouseup on document so we catch it even if cursor leaves the chart
    this.element.addEventListener('mousedown', onMouseDown);
    this.element.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    this.element.addEventListener('mouseleave', onMouseLeave);
    this.element.addEventListener('wheel', onWheel, { passive: false });
    this.element.addEventListener('contextmenu', onContextMenu);
    this.element.addEventListener('touchstart', onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', onTouchMove, { passive: false });
    this.element.addEventListener('touchend', onTouchEnd);
    document.addEventListener('keydown', onKeyDown);

    this.boundHandlers.push(
      () => this.element.removeEventListener('mousedown', onMouseDown),
      () => this.element.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('mouseup', onMouseUp),
      () => this.element.removeEventListener('mouseleave', onMouseLeave),
      () => this.element.removeEventListener('wheel', onWheel),
      () => this.element.removeEventListener('contextmenu', onContextMenu),
      () => this.element.removeEventListener('touchstart', onTouchStart),
      () => this.element.removeEventListener('touchmove', onTouchMove),
      () => this.element.removeEventListener('touchend', onTouchEnd),
      () => document.removeEventListener('keydown', onKeyDown),
    );
  }

  detach(): void {
    for (const remove of this.boundHandlers) remove();
    this.boundHandlers = [];
  }

  private getMousePos(e: MouseEvent): Point {
    const rect = this.element.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private getTouchPos(touch: Touch): Point {
    const rect = this.element.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  private getTouchDistance(a: Touch, b: Touch): number {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  private getTouchMidpoint(a: Touch, b: Touch): Point {
    const rect = this.element.getBoundingClientRect();
    return {
      x: (a.clientX + b.clientX) / 2 - rect.left,
      y: (a.clientY + b.clientY) / 2 - rect.top,
    };
  }
}
