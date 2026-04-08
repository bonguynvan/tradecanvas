import { LayerType } from '@chart-lib/commons';

export type RenderCallback = (dirtyLayers: ReadonlySet<LayerType>) => void;

export class RenderLoop {
  private animFrameId = 0;
  private running = false;
  private dirtyLayers = new Set<LayerType>();
  // Swap set — avoids allocation per frame
  private swapLayers = new Set<LayerType>();
  private callback: RenderCallback | null = null;

  setCallback(cb: RenderCallback): void {
    this.callback = cb;
  }

  markDirty(layer: LayerType): void {
    this.dirtyLayers.add(layer);
    if (this.running && !this.animFrameId) {
      this.scheduleFrame();
    }
  }

  markAllDirty(): void {
    this.dirtyLayers.add(LayerType.Background);
    this.dirtyLayers.add(LayerType.Main);
    this.dirtyLayers.add(LayerType.Overlay);
    this.dirtyLayers.add(LayerType.UI);
    if (this.running && !this.animFrameId) {
      this.scheduleFrame();
    }
  }

  start(): void {
    this.running = true;
    this.markAllDirty();
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private scheduleFrame(): void {
    this.animFrameId = requestAnimationFrame(() => {
      this.animFrameId = 0;
      if (!this.running || !this.callback) return;
      if (this.dirtyLayers.size > 0) {
        // Swap sets to avoid allocation — pass current dirty set, clear it via swap
        const toRender = this.dirtyLayers;
        this.dirtyLayers = this.swapLayers;
        this.callback(toRender);
        toRender.clear();
        this.swapLayers = toRender;
      }
    });
  }
}
