import type { DataSeries } from '@tradecanvas/commons';
import { parseOHLCV, type ParseResult } from './parseOHLCV.js';

export interface DragDropImporterCallbacks {
  /** Called with the parsed series. Hook into chart.setData() here. */
  onData: (data: DataSeries, result: ParseResult, file: File) => void;
  /** Called when parsing throws. Hook a toast/banner here. */
  onError?: (err: Error, file: File) => void;
}

/**
 * Hooks `dragover` / `drop` on a host element so users can drop a CSV / JSON
 * file onto the chart and get it loaded. A subtle dashed-outline overlay
 * shows up during the drag for visual confirmation.
 *
 * The host owns calling `chart.setData()` via the `onData` callback — the
 * importer stays decoupled from Chart so it can be reused in other surfaces
 * (backtester UI, comparison views, etc.).
 */
export class DragDropImporter {
  private host: HTMLElement;
  private overlay: HTMLDivElement | null = null;
  private callbacks: DragDropImporterCallbacks;
  private bound: { dragenter: (e: DragEvent) => void; dragover: (e: DragEvent) => void; dragleave: (e: DragEvent) => void; drop: (e: DragEvent) => void };
  private depth = 0;

  constructor(host: HTMLElement, callbacks: DragDropImporterCallbacks) {
    this.host = host;
    this.callbacks = callbacks;
    this.bound = {
      dragenter: (e) => this.onDragEnter(e),
      dragover: (e) => this.onDragOver(e),
      dragleave: (e) => this.onDragLeave(e),
      drop: (e) => this.onDrop(e),
    };
  }

  attach(): void {
    this.host.addEventListener('dragenter', this.bound.dragenter);
    this.host.addEventListener('dragover', this.bound.dragover);
    this.host.addEventListener('dragleave', this.bound.dragleave);
    this.host.addEventListener('drop', this.bound.drop);
  }

  detach(): void {
    this.host.removeEventListener('dragenter', this.bound.dragenter);
    this.host.removeEventListener('dragover', this.bound.dragover);
    this.host.removeEventListener('dragleave', this.bound.dragleave);
    this.host.removeEventListener('drop', this.bound.drop);
    this.hideOverlay();
  }

  private onDragEnter(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    this.depth++;
    this.showOverlay();
  }

  private onDragOver(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  private onDragLeave(e: DragEvent): void {
    if (!hasFiles(e)) return;
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) this.hideOverlay();
  }

  private async onDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    this.depth = 0;
    this.hideOverlay();

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseOHLCV(text);
      if (result.data.length === 0) {
        throw new Error(`No valid OHLCV rows found in "${file.name}"`);
      }
      this.callbacks.onData(result.data, result, file);
    } catch (err) {
      this.callbacks.onError?.(err as Error, file);
    }
  }

  private showOverlay(): void {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      inset: '8px',
      zIndex: '90',
      pointerEvents: 'none',
      borderRadius: '10px',
      border: '2px dashed var(--tcw-accent, #4f88ff)',
      background: 'rgba(79, 136, 255, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--tcw-accent, #4f88ff)',
      fontSize: '14px',
      fontWeight: '600',
      letterSpacing: '-0.005em',
      fontFamily: 'inherit',
      backdropFilter: 'blur(2px)',
    });
    this.overlay.textContent = 'Drop CSV or JSON to load chart data';
    // The host needs `position: relative` for absolute inset to work; Chart
    // already sets this, but guard for arbitrary hosts.
    const cs = getComputedStyle(this.host);
    if (cs.position === 'static') this.host.style.position = 'relative';
    this.host.appendChild(this.overlay);
  }

  private hideOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
  }
}

function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer?.types?.includes('Files') ?? false;
}
