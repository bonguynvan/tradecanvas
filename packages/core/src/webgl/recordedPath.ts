/** A gradient made on the recording context. */
export class RecordedGradient {
  readonly stops: { offset: number; color: string }[] = [];
  constructor(readonly x0: number, readonly y0: number, readonly x1: number, readonly y1: number) {}
  addColorStop(offset: number, color: string): void {
    if (!(offset >= 0 && offset <= 1)) throw new RangeError('offset out of range');
    this.stops.push({ offset, color });
  }
}

/** The browser's Path2D (a stand-in where there is none, as in tests). */
const NativePath2D: { new (path?: Path2D | string): Path2D } =
  typeof Path2D === 'function' ? Path2D : (class {} as unknown as { new (path?: Path2D | string): Path2D });

/**
 * A Path2D made while a step records. It is a real Path2D too (a chart that
 * keeps one and draws it on a real context later still can), and remembers
 * its calls to play them back on the recording context when it's filled,
 * stroked or clipped (at the transform of that moment, as Canvas 2D does).
 * Calls the GPU can't follow (ellipses, SVG path data…) mark it, and the
 * step goes to Canvas 2D.
 */
export class RecordedPath extends NativePath2D {
  readonly calls: [string, number[]][] = [];
  unsupported = false;

  constructor(from?: Path2D | string) {
    super(from);
    if (from instanceof RecordedPath) {
      this.calls.push(...from.calls);
      this.unsupported = from.unsupported;
    } else if (from !== undefined) {
      this.unsupported = true;
    }
  }

  private note(name: string, args: number[], native: readonly unknown[] = args): void {
    this.calls.push([name, args]);
    const own = (NativePath2D.prototype as unknown as Record<string, ((...a: unknown[]) => void) | undefined>)[name];
    own?.apply(this, native as unknown[]);
  }

  /** A call the GPU can't follow: still made on the real path, and the step goes to Canvas 2D. */
  private unfollowed(name: string, args: readonly unknown[]): void {
    this.unsupported = true;
    this.note(name, [], args);
  }

  moveTo(x: number, y: number): void { this.note('moveTo', [x, y]); }
  lineTo(x: number, y: number): void { this.note('lineTo', [x, y]); }
  closePath(): void { this.note('closePath', []); }
  rect(x: number, y: number, w: number, h: number): void { this.note('rect', [x, y, w, h]); }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean): void { this.note('arc', [x, y, r, a0, a1, ccw ? 1 : 0]); }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void { this.note('quadraticCurveTo', [cx, cy, x, y]); }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void { this.note('bezierCurveTo', [c1x, c1y, c2x, c2y, x, y]); }

  arcTo(...a: Parameters<Path2D['arcTo']>): void { this.unfollowed('arcTo', a); }
  ellipse(...a: Parameters<Path2D['ellipse']>): void { this.unfollowed('ellipse', a); }
  roundRect(...a: Parameters<Path2D['roundRect']>): void { this.unfollowed('roundRect', a); }

  addPath(path: Path2D, transform?: DOMMatrix2DInit): void {
    if (!(path instanceof RecordedPath) || transform !== undefined) this.unsupported = true;
    else {
      this.calls.push(...path.calls);
      this.unsupported ||= path.unsupported;
    }
    (NativePath2D.prototype as unknown as { addPath?: (p: Path2D, t?: DOMMatrix2DInit) => void }).addPath?.call(this, path, transform);
  }
}

/**
 * Run `draw` with the global Path2D swapped for RecordedPath, so the paths
 * it makes record too; put back after, as it was (own property or none).
 */
export function withRecordedPaths(draw: () => void): void {
  const scope = globalThis as { Path2D?: unknown };
  const owned = Object.prototype.hasOwnProperty.call(scope, 'Path2D');
  const real = scope.Path2D;
  scope.Path2D = RecordedPath;
  try {
    draw();
  } finally {
    if (owned) scope.Path2D = real;
    else delete scope.Path2D;
  }
}
