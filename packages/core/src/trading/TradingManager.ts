import type {
  TradingOrder,
  TradingPosition,
  DepthData,
  TradingConfig,
  ViewportState,
  Theme,
  Point,
} from '@chart-lib/commons';
import { DEFAULT_TRADING_CONFIG } from '@chart-lib/commons';
import { yToPrice } from '../viewport/ScaleMapping.js';
import { OrderRenderer } from './OrderRenderer.js';
import { PositionRenderer } from './PositionRenderer.js';
import { DepthOverlay } from './DepthOverlay.js';
import { TradingDragHandler } from './TradingDragHandler.js';
import { TradingContextMenu } from './TradingContextMenu.js';

export class TradingManager {
  private orders: TradingOrder[] = [];
  private positions: TradingPosition[] = [];
  private depthData: DepthData | null = null;
  private currentPrice: number | null = null;
  private config: TradingConfig;

  private orderRenderer = new OrderRenderer();
  private positionRenderer = new PositionRenderer();
  private depthOverlay = new DepthOverlay();
  private dragHandler: TradingDragHandler;
  private contextMenu = new TradingContextMenu();

  private requestRender: (() => void) | null = null;
  private eventCallback: ((event: string, data: unknown) => void) | null = null;
  private container: HTMLElement | null = null;

  constructor(config?: Partial<TradingConfig>) {
    this.config = { ...DEFAULT_TRADING_CONFIG, ...config };
    this.dragHandler = new TradingDragHandler(this.config.dragThreshold);

    this.contextMenu.onItemSelect = (intent) => {
      this.eventCallback?.('orderPlace', intent);
    };
  }

  setContainer(container: HTMLElement): void {
    this.container = container;
  }

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setEventCallback(cb: (event: string, data: unknown) => void): void {
    this.eventCallback = cb;
  }

  // --- State ---

  setOrders(orders: TradingOrder[]): void {
    this.orders = orders;
    this.requestRender?.();
  }

  setPositions(positions: TradingPosition[]): void {
    this.positions = positions;
    this.requestRender?.();
  }

  setDepthData(depth: DepthData | null): void {
    this.depthData = depth;
    this.requestRender?.();
  }

  setCurrentPrice(price: number): void {
    this.currentPrice = price;
    this.requestRender?.();
  }

  setConfig(config: Partial<TradingConfig>): void {
    Object.assign(this.config, config);
    this.requestRender?.();
  }

  // --- Pointer events ---

  onPointerDown(pos: Point, viewport: ViewportState): boolean {
    if (!this.config.enabled) return false;
    return this.dragHandler.onPointerDown(pos, this.orders, this.positions, viewport, 8);
  }

  onPointerMove(pos: Point, viewport: ViewportState): boolean {
    if (!this.dragHandler.isActive()) return false;
    const consumed = this.dragHandler.onPointerMove(pos, viewport);
    if (consumed) this.requestRender?.();
    return consumed;
  }

  onPointerUp(): boolean {
    const result = this.dragHandler.onPointerUp();
    if (result) {
      if (result.sourceType === 'order') {
        this.eventCallback?.('orderModify', {
          orderId: result.id,
          newPrice: result.newPrice,
          previousPrice: result.previousPrice,
        });
      } else {
        this.eventCallback?.('positionModify', {
          positionId: result.id,
          [result.sourceType]: result.newPrice,
        });
      }
      this.requestRender?.();
      return true;
    }
    return false;
  }

  onContextMenu(pos: Point, viewport: ViewportState): boolean {
    if (!this.config.enabled || !this.config.contextMenu?.enabled || !this.container) return false;
    const price = yToPrice(pos.y, viewport);
    this.contextMenu.show(pos, price, this.container, this.config);
    return true;
  }

  // --- Render ---

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.config.enabled) return;

    // Depth overlay (back)
    if (this.depthData) {
      this.depthOverlay.render(ctx, this.depthData, viewport, this.config);
    }

    // Positions (middle)
    if (this.positions.length > 0) {
      this.positionRenderer.render(ctx, this.positions, this.currentPrice, viewport, theme, this.config);
    }

    // Orders (front)
    if (this.orders.length > 0) {
      this.orderRenderer.render(ctx, this.orders, viewport, theme, this.config, this.dragHandler.getDragState());
    }
  }

  destroy(): void {
    this.contextMenu.destroy();
  }
}
