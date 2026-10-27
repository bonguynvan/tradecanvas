/**
 * Captures the chart as an image by compositing all canvas layers.
 */
export class Screenshot {
  /**
   * Export the chart container as a PNG data URL.
   */
  static toDataURL(container: HTMLElement, background?: string): string {
    return this.compose(container, background)?.toDataURL('image/png') ?? '';
  }

  /**
   * Export as a PNG Blob (for the clipboard or file saving), or null when
   * there is nothing to encode. The canvas encodes it itself: fetching a data
   * URL instead fails on a page whose Content-Security-Policy leaves `data:`
   * out of `connect-src`. The layers are drawn before the first await, so the
   * GPU frame is still there; only the encoding waits.
   */
  static async toBlob(container: HTMLElement, background?: string): Promise<Blob | null> {
    const canvas = this.compose(container, background);
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  /**
   * Trigger browser download of the chart image.
   */
  static download(container: HTMLElement, filename = 'chart.png', background?: string): void {
    const dataURL = this.toDataURL(container, background);
    if (!dataURL) return;

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * The container's layers drawn onto one new canvas the size of the first,
   * lowest z-index first, over `background`; null without a canvas. It draws
   * at once, because the GPU canvas keeps its pixels only until its frame is
   * shown.
   */
  private static compose(container: HTMLElement, background?: string): HTMLCanvasElement | null {
    const canvases = container.querySelectorAll('canvas');
    if (canvases.length === 0) return null;

    const first = canvases[0];
    const width = first.width;
    const height = first.height;

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const ctx = compositeCanvas.getContext('2d')!;

    // Background
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    // Composite all layers in order (lowest z-index first)
    const sorted = Array.from(canvases).sort((a, b) => {
      return (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0);
    });

    for (const canvas of sorted) {
      ctx.drawImage(canvas, 0, 0);
    }

    return compositeCanvas;
  }
}
