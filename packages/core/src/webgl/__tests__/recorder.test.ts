import { describe, it, expect, vi } from 'vitest';
import { createRecorder, type GpuCommand } from '../recorder.js';

const plot = { x: 10, y: 20, width: 100, height: 50 };

/** Record one step at `dpr` in the plot; the commands and whether it was kept. */
function record(draw: (c: CanvasRenderingContext2D) => void, dpr = 1) {
  const rec = createRecorder(dpr, null);
  const kept = rec.region(plot).step(draw);
  return { kept, commands: rec.commands as GpuCommand[] };
}

describe('the recording context: fills', () => {
  it('records axis-aligned rectangles as rectangles, clipped to the region, in device pixels', () => {
    const { kept, commands } = record((c) => {
      c.fillStyle = '#ff0000';
      c.beginPath();
      c.rect(0, 30, 20, 10); // reaches left of the plot
      c.rect(50, 40, 5, 5);
      c.fill();
      c.globalAlpha = 0.5;
      c.fillRect(60, 30, 4, 4);
    }, 2);
    expect(kept).toBe(true);
    // One command for the step: rectangles in a row draw together.
    expect(commands).toEqual([
      { type: 'rects', values: [20, 60, 40, 80, 1, 0, 0, 1, 100, 80, 110, 90, 1, 0, 0, 1, 120, 60, 128, 68, 0.5, 0, 0, 0.5] },
    ]);
  });

  it('records full circles as discs', () => {
    const { commands } = record((c) => {
      c.fillStyle = 'rgba(0, 0, 255, 0.5)';
      c.beginPath();
      c.moveTo(43, 40);
      c.arc(40, 40, 3, 0, Math.PI * 2);
      c.moveTo(63, 40);
      c.arc(60, 40, 3, 0, Math.PI * 2);
      c.fill();
    });
    expect(commands).toEqual([{ type: 'circles', values: [40, 40, 3, 0, 0, 0.5, 0.5, 60, 40, 3, 0, 0, 0.5, 0.5], clip: { x0: 10, y0: 20, x1: 110, y1: 70 } }]);
  });

  it('records any other shape as spans between its two sides, with their bounds', () => {
    const { commands } = record((c) => {
      c.fillStyle = '#00ff00';
      c.beginPath();
      c.moveTo(20, 30);
      c.lineTo(40, 30.5);
      c.lineTo(30, 50);
      c.closePath();
      c.fill('evenodd');
    });
    expect(commands).toHaveLength(1);
    const fill = commands[0] as Extract<GpuCommand, { type: 'fill' }>;
    // Cut at the middle corner: a span each side, the polygon's ends marked.
    expect(fill.spans).toEqual([20, 30, 30, 30.25, 30, 50, 1, 0, 30, 40, 30.25, 30.5, 50, 30.5, 0, 1]);
    expect(fill.bounds).toEqual({ x0: 20, y0: 30, x1: 40, y1: 50 });
    expect(fill.paint).toEqual({ kind: 'solid', color: [0, 1, 0, 1] });
  });

  it('records a linear gradient in device pixels, its stops in order', () => {
    const { commands } = record((c) => {
      const g = c.createLinearGradient(0, 20, 0, 70);
      g.addColorStop(1, 'rgba(255, 0, 0, 0)');
      g.addColorStop(0, '#ff0000');
      c.fillStyle = g;
      c.fillRect(20, 30, 10, 10);
    }, 2);
    const fill = commands[0] as Extract<GpuCommand, { type: 'fill' }>;
    expect(fill.type).toBe('fill');
    // Stops unpremultiplied: Canvas 2D blends between them so.
    expect(fill.paint).toEqual({ kind: 'linear', x0: 0, y0: 40, x1: 0, y1: 140, stops: [{ offset: 0, color: [1, 0, 0, 1] }, { offset: 1, color: [1, 0, 0, 0] }] });
  });

  it('skips what is fully clipped or transparent', () => {
    const { commands } = record((c) => {
      c.fillStyle = '#ff0000';
      c.fillRect(200, 200, 5, 5);
      c.fillStyle = 'transparent';
      c.fillRect(20, 30, 5, 5);
    });
    expect(commands).toEqual([]);
  });
});

describe('the recording context: strokes', () => {
  it('records a polyline with two neighbour slots each side and lengths along it', () => {
    const { commands } = record((c) => {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(20, 30);
      c.lineTo(23, 34);
      c.lineTo(33, 34);
      c.stroke();
    }, 2);
    const stroke = commands[0] as Extract<GpuCommand, { type: 'stroke' }>;
    expect(stroke.type).toBe('stroke');
    expect(stroke.width).toBe(3);
    expect(stroke.cap).toBe(0);
    expect(stroke.dash).toBeNull();
    const sep = [0, 0, -1, 0];
    expect(stroke.points).toEqual([...sep, ...sep, 40, 60, 1, 0, 46, 68, 1, 10, 66, 68, 1, 30, ...sep, ...sep]);
  });

  it('separates subpaths with one break', () => {
    const { commands } = record((c) => {
      c.strokeStyle = '#fff';
      c.beginPath();
      c.moveTo(20, 30);
      c.lineTo(30, 30);
      c.moveTo(20, 40);
      c.lineTo(30, 40);
      c.stroke();
    });
    const pts = (commands[0] as Extract<GpuCommand, { type: 'stroke' }>).points;
    const w = pts.filter((_, i) => i % 4 === 2);
    expect(w).toEqual([-1, -1, 1, 1, -1, 1, 1, -1, -1]);
  });

  it('joins a closed path all round: its corners on either side as neighbours', () => {
    const { commands } = record((c) => {
      c.strokeStyle = '#fff';
      c.strokeRect(20, 30, 10, 10);
    });
    const pts = (commands[0] as Extract<GpuCommand, { type: 'stroke' }>).points;
    const xyw = [];
    for (let i = 0; i < pts.length; i += 4) xyw.push([pts[i], pts[i + 1], pts[i + 2]]);
    expect(xyw).toEqual([
      [0, 0, -1], [0, 0, -1],
      [30, 40, 0], [20, 40, 0],
      [20, 30, 1], [30, 30, 1], [30, 40, 1], [20, 40, 1], [20, 30, 1],
      [30, 30, 0], [30, 40, 0],
      [0, 0, -1], [0, 0, -1],
    ]);
  });

  it('records a dash pattern as two on-off pairs, in device pixels', () => {
    const { commands } = record((c) => {
      c.strokeStyle = '#fff';
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(20, 30);
      c.lineTo(80, 30);
      c.stroke();
    }, 2);
    expect((commands[0] as Extract<GpuCommand, { type: 'stroke' }>).dash).toEqual([8, 8, 8, 8]);
  });
});

describe('the recording context: what it keeps and what it gives up', () => {
  it('keeps text for the 2D canvas, with its state', () => {
    const rec = createRecorder(2, null);
    const region = rec.region(plot);
    expect(region.step((c) => {
      c.font = '12px sans-serif';
      c.fillStyle = '#123456';
      c.textAlign = 'right';
      c.fillText('42', 50, 40);
    })).toBe(true);
    expect(rec.commands).toEqual([]);
    const target = { save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D;
    region.drawText(target);
    expect(target.fillText).toHaveBeenCalledWith('42', 50, 40, undefined);
    expect(target.fillStyle).toBe('#123456');
    expect(target.textAlign).toBe('right');
    // Clipped to the region in device pixels, drawn at the device-pixel-ratio transform.
    expect(target.rect).toHaveBeenCalledWith(20, 40, 200, 100);
    expect(target.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('gives up a step that draws an image, and drops what it recorded', () => {
    const rec = createRecorder(1, null);
    const region = rec.region(plot);
    expect(region.step((c) => c.fillRect(20, 30, 5, 5))).toBe(true);
    const kept = region.step((c) => {
      c.fillRect(30, 30, 5, 5);
      c.drawImage({} as CanvasImageSource, 0, 0);
    });
    expect(kept).toBe(false);
    expect(rec.commands).toHaveLength(1);
  });

  it('gives up shadows, other blending, rotated text and non-rectangular clips', () => {
    const tries: ((c: CanvasRenderingContext2D) => void)[] = [
      (c) => { c.shadowColor = '#000'; c.shadowBlur = 4; c.fillRect(20, 30, 5, 5); },
      (c) => { c.globalCompositeOperation = 'lighter'; c.fillRect(20, 30, 5, 5); },
      (c) => { c.beginPath(); c.arc(40, 40, 5, 0, 7); c.clip(); },
      (c) => { c.fillStyle = c.createPattern({} as CanvasImageSource, 'repeat')!; },
      (c) => { c.rotate(0.3); c.lineWidth = 2; c.beginPath(); c.moveTo(20, 30); c.lineTo(40, 30); c.stroke(); },
    ];
    for (const t of tries) expect(record(t).kept).toBe(false);
  });

  it('clips to an axis-aligned rectangle', () => {
    const { commands } = record((c) => {
      c.save();
      c.beginPath();
      c.rect(20, 30, 10, 10);
      c.clip();
      c.fillStyle = '#fff';
      c.fillRect(0, 0, 100, 100);
      c.restore();
      c.fillRect(100, 60, 20, 20);
    });
    expect(commands).toEqual([
      // After restore(), the clip and the fill colour (black) are back.
      { type: 'rects', values: [20, 30, 30, 40, 1, 1, 1, 1, 100, 60, 110, 70, 0, 0, 0, 1] },
    ]);
  });

  it('starts each step afresh, at the device-pixel-ratio transform', () => {
    const rec = createRecorder(2, null);
    const region = rec.region(plot);
    region.step((c) => { c.lineWidth = 5; c.translate(3, 3); });
    region.step((c) => {
      expect(c.lineWidth).toBe(1);
      const m = c.getTransform();
      expect([m.a, m.d, m.e, m.f]).toEqual([2, 2, 0, 0]);
    });
  });

  it('lets device-pixel drawing (setTransform to identity) through', () => {
    const { commands } = record((c) => {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#fff';
      c.fillRect(41, 61, 2, 10);
      c.restore();
    }, 2);
    expect(commands).toEqual([{ type: 'rects', values: [41, 61, 43, 71, 1, 1, 1, 1] }]);
  });
});

describe('the recording context: Path2D', () => {
  it('records a Path2D made while drawing, filled, stroked and clipped to', () => {
    const { kept, commands } = record((c) => {
      const clip = new Path2D();
      clip.rect(20, 30, 30, 20);
      c.save();
      c.clip(clip);
      const bars = new Path2D();
      bars.rect(25, 35, 4, 10);
      bars.rect(10, 35, 40, 2);
      c.fillStyle = '#fff';
      c.fill(bars);
      const line = new Path2D();
      line.moveTo(20, 40);
      line.lineTo(40, 45);
      c.strokeStyle = '#fff';
      c.stroke(line);
      c.restore();
    });
    expect(kept).toBe(true);
    expect(commands[0]).toEqual({ type: 'rects', values: [25, 35, 29, 45, 1, 1, 1, 1, 20, 35, 50, 37, 1, 1, 1, 1] });
    expect(commands[1].type).toBe('stroke');
    expect((commands[1] as Extract<GpuCommand, { type: 'stroke' }>).clip).toEqual({ x0: 20, y0: 30, x1: 50, y1: 50 });
  });

  it('puts the real Path2D back after each step', () => {
    const before = (globalThis as { Path2D?: unknown }).Path2D;
    record(() => { throw new Error('boom'); });
    expect((globalThis as { Path2D?: unknown }).Path2D).toBe(before);
  });

  it('gives up a Path2D from SVG path data, or from outside the step', () => {
    expect(record((c) => { c.fill(new Path2D('M0 0 L10 10 Z')); }).kept).toBe(false);
    const outside = { moveTo() {} } as unknown as Path2D;
    expect(record((c) => { c.fill(outside); }).kept).toBe(false);
  });
});

describe('the recording context: overlaps', () => {
  it('leaves a stroke whose pieces overlap to Canvas 2D, which draws their union', () => {
    // Marks stacked in a column, as a point and figure chart draws them.
    const { kept } = record((c) => {
      c.strokeStyle = '#fff';
      c.lineWidth = 2;
      c.beginPath();
      for (let k = 0; k < 4; k++) {
        c.moveTo(20, 30 + k * 2);
        c.lineTo(24, 33 + k * 2);
      }
      c.stroke();
    });
    expect(kept).toBe(false);
  });

  it('keeps a line broken by gaps, its pieces side by side', () => {
    const { kept } = record((c) => {
      c.strokeStyle = '#fff';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(20, 30);
      c.lineTo(30, 35);
      c.moveTo(32.4, 36);
      c.lineTo(40, 31);
      c.stroke();
    });
    expect(kept).toBe(true);
  });

  it('leaves overlapping see-through shapes to Canvas 2D, which paints their union once', () => {
    const { kept } = record((c) => {
      c.fillStyle = 'rgba(255, 0, 0, 0.5)';
      c.beginPath();
      c.rect(20, 30, 10, 10);
      c.rect(25, 35, 10, 10);
      c.fill();
    });
    expect(kept).toBe(false);
  });

  it('leaves a shape that doubles back to Canvas 2D', () => {
    const { kept } = record((c) => {
      c.fillStyle = '#fff';
      c.beginPath();
      for (const [x, y] of [[40, 30], [30, 30], [30, 40], [40, 40], [40, 37], [33, 37], [33, 33], [40, 33]]) c.lineTo(x, y);
      c.fill();
    });
    expect(kept).toBe(false);
  });

  it('keeps opaque or apart rectangles as rectangles', () => {
    const { commands } = record((c) => {
      c.fillStyle = '#ff0000';
      c.beginPath();
      c.rect(20, 30, 10, 10);
      c.rect(25, 35, 10, 10);
      c.fill();
      c.fillStyle = 'rgba(255, 0, 0, 0.5)';
      c.beginPath();
      c.rect(20, 30, 5, 10);
      c.rect(25, 30, 5, 10);
      c.fill();
    });
    expect(commands.map((x) => x.type)).toEqual(['rects']);
    expect((commands[0] as Extract<GpuCommand, { type: 'rects' }>).values).toHaveLength(4 * 8);
  });

  it('keeps the rectangles of each step apart, so a step given up drops only its own', () => {
    const rec = createRecorder(1, null);
    const region = rec.region(plot);
    region.step((c) => c.fillRect(20, 30, 5, 5));
    region.step((c) => {
      c.fillRect(30, 30, 5, 5);
      c.drawImage({} as CanvasImageSource, 0, 0);
    });
    region.step((c) => c.fillRect(40, 30, 5, 5));
    expect(rec.commands).toEqual([
      { type: 'rects', values: [20, 30, 25, 35, 0, 0, 0, 1] },
      { type: 'rects', values: [40, 30, 45, 35, 0, 0, 0, 1] },
    ]);
  });

  it('fills rectangles of one colour at alphas of their own, as heatmap cells are', () => {
    const { commands } = record((c) => {
      c.fillStyle = '#ff0000';
      c.globalAlpha = 0.5;
      c.fillRect(20, 30, 5, 5);
      c.globalAlpha = 0.25;
      c.fillRect(30, 30, 5, 5);
      c.globalAlpha = 0;
      c.fillRect(40, 30, 5, 5);
    });
    expect(commands).toEqual([{ type: 'rects', values: [20, 30, 25, 35, 0.5, 0, 0, 0.5, 30, 30, 35, 35, 0.25, 0, 0, 0.25] }]);
  });

  it('leaves the current path as it was on fillRect', () => {
    const { commands } = record((c) => {
      c.fillStyle = '#ff0000';
      c.beginPath();
      c.rect(50, 40, 5, 5);
      c.fillRect(20, 30, 5, 5);
      c.fill();
    });
    expect(commands).toEqual([{ type: 'rects', values: [20, 30, 25, 35, 1, 0, 0, 1, 50, 40, 55, 45, 1, 0, 0, 1] }]);
  });

  it('gives up a step that writes text in a region that takes none, keeping the steps that do not', () => {
    const rec = createRecorder(1, null);
    const region = rec.region(plot, { text: false });
    expect(region.step((c) => {
      c.fillRect(20, 30, 5, 5);
      c.fillText('A', 25, 35);
    })).toBe(false);
    expect(region.step((c) => c.fillRect(40, 30, 5, 5))).toBe(true);
    expect(rec.commands).toEqual([{ type: 'rects', values: [40, 30, 45, 35, 0, 0, 0, 1] }]);
  });
});

describe('the recording context: as Canvas 2D would draw it', () => {
  it('leaves overlapping shapes that make holes to Canvas 2D: even-odd, or wound against each other', () => {
    expect(record((c) => {
      c.beginPath();
      c.rect(20, 30, 40, 30);
      c.rect(30, 35, 10, 10);
      c.fill('evenodd');
    }).kept).toBe(false);
    expect(record((c) => {
      c.beginPath();
      c.rect(20, 30, 40, 30);
      c.rect(40, 35, -10, 10);
      c.fill();
    }).kept).toBe(false);
  });

  it('leaves sharp mitered or bevelled corners to Canvas 2D, and takes round or gentle ones', () => {
    const corner = (join: CanvasLineJoin, turn: number) => record((c) => {
      c.lineWidth = 3;
      c.lineJoin = join;
      c.beginPath();
      c.moveTo(20, 40);
      c.lineTo(40, 40);
      c.lineTo(40 + 20 * Math.cos(turn), 40 + 20 * Math.sin(turn));
      c.stroke();
    }).kept;
    expect(corner('miter', Math.PI / 2)).toBe(false);
    expect(corner('bevel', Math.PI / 2)).toBe(false);
    expect(corner('round', Math.PI / 2)).toBe(true);
    expect(corner('miter', 0.2)).toBe(true);
  });

  it('takes any corner of a hairline', () => {
    expect(record((c) => {
      c.beginPath();
      c.moveTo(20, 40);
      c.lineTo(40, 40);
      c.lineTo(40, 60);
      c.stroke();
    }).kept).toBe(true);
  });

  it('dashes single segments only', () => {
    expect(record((c) => {
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(20, 40);
      c.lineTo(40, 40);
      c.lineTo(40, 60);
      c.stroke();
    }).kept).toBe(false);
  });

  it('leaves a see-through line of segments shorter than it is wide to Canvas 2D', () => {
    expect(record((c) => {
      c.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      c.lineWidth = 4;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(20, 40);
      for (let k = 1; k < 10; k++) c.lineTo(20 + k, 40 + (k % 2));
      c.stroke();
    }).kept).toBe(false);
  });

  it('draws a zero-length line as a dot with round caps, and not at all with butt ones', () => {
    const dot = (cap: CanvasLineCap) => record((c) => {
      c.lineCap = cap;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(30, 40);
      c.lineTo(30, 40);
      c.stroke();
    }).commands;
    expect(dot('round').map((x) => x.type)).toEqual(['stroke']);
    expect(dot('butt')).toEqual([]);
  });

  it('goes round an arc counterclockwise the long way', () => {
    const { commands } = record((c) => {
      c.beginPath();
      c.arc(40, 40, 10, 0, Math.PI / 2, true);
      c.stroke();
    });
    const pts = (commands[0] as Extract<GpuCommand, { type: 'stroke' }>).points;
    const drawn: [number, number][] = [];
    for (let i = 0; i < pts.length; i += 4) if (pts[i + 2] === 1) drawn.push([pts[i], pts[i + 1]]);
    const near = (x: number, y: number) => Math.min(...drawn.map(([px, py]) => Math.hypot(px - x, py - y)));
    expect(drawn[0]).toEqual([50, 40]);
    expect(near(40, 50)).toBeLessThan(1e-9);
    // Through the top and the left, not the bottom right.
    expect(near(40, 30)).toBeLessThan(1);
    expect(near(30, 40)).toBeLessThan(1);
    expect(near(40 + 10 * Math.SQRT1_2, 40 + 10 * Math.SQRT1_2)).toBeGreaterThan(5);
  });

  it('gives up a step that throws, as an arc of negative radius does', () => {
    expect(record((c) => c.arc(40, 40, -1, 0, 1)).kept).toBe(false);
  });

  it('carries a gradient through a translate and scale', () => {
    const { commands } = record((c) => {
      c.translate(10, 20);
      c.scale(2, 2);
      const g = c.createLinearGradient(0, 0, 0, 10);
      g.addColorStop(0, '#fff');
      g.addColorStop(1, '#000');
      c.fillStyle = g;
      c.fillRect(0, 0, 10, 10);
    });
    const paint = (commands[0] as Extract<GpuCommand, { type: 'fill' }>).paint;
    expect(paint).toMatchObject({ kind: 'linear', x0: 10, y0: 20, x1: 10, y1: 40 });
  });

  it('ignores a colour it cannot read, keeping the one before, as Canvas 2D does', () => {
    const { commands } = record((c) => {
      c.fillStyle = '#00ff00';
      c.fillStyle = 'not a colour';
      c.fillRect(20, 30, 5, 5);
    });
    expect(commands).toEqual([{ type: 'rects', values: [20, 30, 25, 35, 0, 1, 0, 1] }]);
  });

  it('drops the text of a step it gives up', () => {
    const rec = createRecorder(1, null);
    const region = rec.region(plot);
    region.step((c) => c.fillText('kept', 20, 30));
    region.step((c) => {
      c.fillText('dropped', 20, 40);
      c.drawImage({} as CanvasImageSource, 0, 0);
    });
    const fillText = vi.fn();
    region.drawText({ save() {}, restore() {}, setTransform() {}, beginPath() {}, rect() {}, clip() {}, fillText } as unknown as CanvasRenderingContext2D);
    expect(fillText.mock.calls.map((call) => call[0])).toEqual(['kept']);
  });

  it('leaves no Path2D behind where there was none', () => {
    const had = 'Path2D' in globalThis;
    record((c) => c.fill(new Path2D()));
    expect('Path2D' in globalThis).toBe(had);
  });
});
