/** Net vertical travel (px) a drag needs before it may move the price scale. */
export const VERTICAL_PAN_ENGAGE_PX = 24;
/** …and that travel must be at least this share of the horizontal travel. */
export const VERTICAL_PAN_MIN_RATIO = 0.5;

/**
 * Decides, per drag gesture, when a chart-body drag should also pan the price
 * scale (which turns auto-scale off). A horizontal drag always drifts a few
 * pixels vertically; engaging on that drift knocked the chart off auto-scale
 * mid-pan, so the price scale stopped following the bars and wobbled with the
 * hand — the drag felt stuck. Now it takes a deliberate vertical move.
 * With auto-scale already off the price scale pans freely, as before.
 */
export class VerticalPanGate {
  private netY = 0;
  private travelX = 0;
  private engaged = false;

  /** Start of a new drag gesture. */
  reset(): void {
    this.netY = 0;
    this.travelX = 0;
    this.engaged = false;
  }

  /** Feed one drag step; true once vertical panning is engaged for this gesture. */
  step(deltaX: number, deltaY: number, autoScaleOn: boolean): boolean {
    if (this.engaged) return true;
    this.netY += deltaY;
    this.travelX += Math.abs(deltaX);
    if (!autoScaleOn) {
      this.engaged = true;
    } else {
      const dy = Math.abs(this.netY);
      this.engaged = dy > VERTICAL_PAN_ENGAGE_PX && dy >= this.travelX * VERTICAL_PAN_MIN_RATIO;
    }
    return this.engaged;
  }
}
