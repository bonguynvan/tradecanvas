/**
 * Captures the chart as an image by compositing all canvas layers.
 */
export class Screenshot {
  /**
   * Export the chart container as a PNG data URL.
   */
  static toDataURL(container: HTMLElement, background?: string): string {
    const canvases = container.querySelectorAll('canvas');
    if (canvases.length === 0) return '';

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

    return compositeCanvas.toDataURL('image/png');
  }

  /**
   * Export as Blob (for file saving).
   */
  static async toBlob(container: HTMLElement, background?: string): Promise<Blob | null> {
    const dataURL = this.toDataURL(container, background);
    if (!dataURL) return null;

    const res = await fetch(dataURL);
    return res.blob();
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
}
