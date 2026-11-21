import { describe, it, expect } from 'vitest';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { computeScene3D, inQuad, resolveView, sceneDepth, sceneX, sceneY, type Axis3D, type Scene3D } from '../scene3d.js';
import { rampColor, resolveColorRamp } from '../colorScale.js';
import { H, W, measure } from './charts3dKit.js';

const AREA = { x: 0, y: 0, width: W, height: H };

const ticks = (texts: string[]): Axis3D => ({ ticks: texts.map((text, i) => ({ at: texts.length === 1 ? 0.5 : i / (texts.length - 1), text })) });
const AXES = { x: { ...ticks(['90', '100', '110']), title: 'Strike' }, y: { ...ticks(['30', '60', '90']), title: 'Days' }, z: { ...ticks(['0.1', '0.2', '0.3']), title: 'IV' } };

/** The eight corners of the box, on the screen. */
function corners(scene: Scene3D): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const u of [0, 1]) for (const v of [0, 1]) for (const h of [0, 1]) out.push({ x: sceneX(scene, u, v), y: sceneY(scene, u, v, h) });
  return out;
}

describe('where a 3D chart is seen from', () => {
  it('is a quarter turn off the corner and a little above the floor when nothing says', () => {
    expect(resolveView()).toEqual({ yaw: -35, pitch: 28 });
    expect(resolveView({ pitch: 40 })).toEqual({ yaw: -35, pitch: 40 });
  });

  it('holds the pitch between the floor and straight above, and the yaw to one turn', () => {
    expect(resolveView({ yaw: 0, pitch: -10 }).pitch).toBe(0);
    expect(resolveView({ yaw: 0, pitch: 120 }).pitch).toBe(90);
    expect(resolveView({ yaw: 370, pitch: 10 }).yaw).toBeCloseTo(10, 9);
    expect(resolveView({ yaw: -190, pitch: 10 }).yaw).toBeCloseTo(170, 9);
    expect(resolveView({ yaw: 180, pitch: 10 }).yaw).toBeCloseTo(180, 9);
  });

  it('takes an angle that is no number as its default', () => {
    expect(resolveView({ yaw: Number.NaN, pitch: Number.POSITIVE_INFINITY })).toEqual({ yaw: -35, pitch: 28 });
  });
});

describe('a 3D chart’s box on the screen', () => {
  it('has x across and the values up when seen level from the front, the y axis end on', () => {
    const scene = computeScene3D(AREA, { yaw: 0, pitch: 0 }, AXES, measure);
    expect(sceneX(scene, 1, 0)).toBeGreaterThan(sceneX(scene, 0, 0));
    expect(sceneY(scene, 0, 0, 1)).toBeLessThan(sceneY(scene, 0, 0, 0));
    expect(sceneX(scene, 0.3, 1)).toBeCloseTo(sceneX(scene, 0.3, 0), 9);
    expect(sceneY(scene, 0.3, 1, 0.5)).toBeCloseTo(sceneY(scene, 0.3, 0, 0.5), 9);
  });

  it('has the y axis up the screen and the values end on when seen from straight above', () => {
    const scene = computeScene3D(AREA, { yaw: 0, pitch: 90 }, AXES, measure);
    expect(sceneY(scene, 0, 1, 0)).toBeLessThan(sceneY(scene, 0, 0, 0));
    expect(sceneY(scene, 0.5, 0.5, 1)).toBeCloseTo(sceneY(scene, 0.5, 0.5, 0), 9);
  });

  it('stays in its room at every turn and tilt, its labels with it', () => {
    for (let yaw = -180; yaw < 180; yaw += 15) {
      for (const pitch of [0, 15, 28, 60, 90]) {
        const scene = computeScene3D(AREA, { yaw, pitch }, AXES, measure);
        for (const corner of corners(scene)) {
          expect(corner.x).toBeGreaterThanOrEqual(-0.5);
          expect(corner.x).toBeLessThanOrEqual(W + 0.5);
          expect(corner.y).toBeGreaterThanOrEqual(-0.5);
          expect(corner.y).toBeLessThanOrEqual(H + 0.5);
        }
        for (const label of scene.labels) {
          const width = label.angle === 0 ? measure(label.text) : 0;
          const left = label.align === 'left' ? label.x : label.align === 'right' ? label.x - width : label.x - width / 2;
          expect(left, `${label.text} at yaw ${yaw}, pitch ${pitch}`).toBeGreaterThanOrEqual(-0.5);
          expect(left + width, `${label.text} at yaw ${yaw}, pitch ${pitch}`).toBeLessThanOrEqual(W + 0.5);
          expect(label.y).toBeGreaterThanOrEqual(0);
          expect(label.y).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it('is the same size at every turn, so it does not swell and shrink as it is turned', () => {
    const sizes = [-170, -35, 0, 45, 90, 133].map((yaw) => computeScene3D(AREA, { yaw, pitch: 28 }, AXES, measure).scale);
    for (const size of sizes) expect(size).toBeCloseTo(sizes[0], 9);
    expect(sizes[0]).toBeGreaterThan(100);
  });

  it('knows which sides are at the back: the ones its grid is drawn on', () => {
    const near = computeScene3D(AREA, { yaw: -35, pitch: 28 }, AXES, measure);
    // The corner where both axes start is the nearest of the floor's four.
    const depths = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => sceneDepth(near, u, v, 0));
    expect(Math.min(...depths)).toBe(depths[0]);
    expect([near.uBack, near.vBack]).toEqual([1, 1]);
    const turned = computeScene3D(AREA, { yaw: 145, pitch: 28 }, AXES, measure);
    expect([turned.uBack, turned.vBack]).toEqual([0, 0]);
    const side = computeScene3D(AREA, { yaw: 35, pitch: 28 }, AXES, measure);
    expect([side.uBack, side.vBack]).toEqual([0, 1]);
  });

  it('writes the values to the left of its left edge, and each floor axis outside the floor', () => {
    const scene = computeScene3D(AREA, { yaw: -35, pitch: 28 }, AXES, measure);
    const left = Math.min(...corners(scene).map((c) => c.x));
    const bottom = Math.max(...corners(scene).map((c) => c.y));
    const values = scene.labels.filter((l) => ['0.1', '0.2', '0.3'].includes(l.text));
    expect(values).toHaveLength(3);
    for (const label of values) {
      expect(label.align).toBe('right');
      expect(label.x).toBeLessThan(left);
    }
    // The higher a value, the higher its label.
    expect(values.find((l) => l.text === '0.3')!.y).toBeLessThan(values.find((l) => l.text === '0.1')!.y);
    // The floor's ticks are under the floor's front edges: lower than the box's middle, and never above its top.
    const middle = sceneY(scene, 0.5, 0.5, 0.5);
    for (const text of ['90', '110', '30', '90']) {
      const label = scene.labels.find((l) => l.text === text)!;
      expect(label.y).toBeGreaterThan(middle);
      expect(label.y).toBeLessThanOrEqual(bottom + 30);
    }
  });

  it('turns each axis title along its axis, never upside down', () => {
    for (const yaw of [-150, -35, 20, 110]) {
      const scene = computeScene3D(AREA, { yaw, pitch: 28 }, AXES, measure);
      const titles = scene.labels.filter((l) => l.title);
      expect(titles.map((l) => l.text).sort()).toEqual(['Days', 'IV', 'Strike']);
      for (const title of titles) {
        expect(title.angle).toBeGreaterThanOrEqual(-Math.PI / 2 - 1e-9);
        expect(title.angle).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
      }
      // The values' title runs up the left edge.
      expect(titles.find((l) => l.text === 'IV')!.angle).toBeCloseTo(-Math.PI / 2, 9);
    }
  });

  it('leaves out a label that would run into one before it, and an axis seen end on', () => {
    const many: Axis3D = { ticks: Array.from({ length: 60 }, (_, i) => ({ at: i / 59, text: `tick ${i}` })) };
    const crowded = computeScene3D(AREA, { yaw: -35, pitch: 28 }, { ...AXES, x: many }, measure);
    const written = crowded.labels.filter((l) => l.text.startsWith('tick'));
    expect(written.length).toBeGreaterThan(1);
    expect(written.length).toBeLessThan(20);
    // From straight above the values' axis is a point: none of its labels is written.
    const above = computeScene3D(AREA, { yaw: -35, pitch: 90 }, AXES, measure);
    expect(above.labels.some((l) => ['0.1', '0.2', '0.3', 'IV'].includes(l.text))).toBe(false);
  });

  it('writes a floor axis’s last tick a line lower where it meets the lowest value’s, and leaves neither out', () => {
    // Turned so that the x axis runs up the left side and ends at the foot of the values' axis.
    const scene = computeScene3D(AREA, { yaw: -107, pitch: 44 }, AXES, measure);
    const written = scene.labels.filter((l) => !l.title).map((l) => l.text).sort();
    expect(written).toEqual(['0.1', '0.2', '0.3', '100', '110', '30', '60', '90', '90']);
  });

  it('keeps an axis’s ticks in one line: one that would run into its neighbour is left out, not set aside', () => {
    const many: Axis3D = { ticks: Array.from({ length: 14 }, (_, i) => ({ at: i / 13, text: `tick ${i}` })) };
    for (const yaw of [-35, 20, 70, 160]) {
      // No other axis has a tick: at a corner one of this axis's would step out of the way of it.
      const scene = computeScene3D(AREA, { yaw, pitch: 28 }, { x: { ticks: [] }, y: many, z: { ticks: [] } }, measure);
      const written = scene.labels.filter((l) => l.text.startsWith('tick'));
      expect(written.length).toBeGreaterThan(2);
      const [first, second] = written;
      for (const label of written.slice(2)) {
        // On the line through the first two.
        const off = (second.x - first.x) * (label.y - first.y) - (second.y - first.y) * (label.x - first.x);
        expect(Math.abs(off) / Math.hypot(second.x - first.x, second.y - first.y), `${label.text} at yaw ${yaw}`).toBeLessThan(0.5);
      }
    }
  });

  it('draws nothing it cannot place in a room of no size', () => {
    const scene = computeScene3D({ x: 0, y: 0, width: 0, height: 0 }, undefined, AXES, measure);
    expect(Number.isFinite(scene.scale)).toBe(true);
    for (const corner of corners(scene)) expect(Number.isFinite(corner.x) && Number.isFinite(corner.y)).toBe(true);
  });
});

describe('colours from the lowest value to the highest', () => {
  it('are one hue by default, from near the ground to its strongest, over the values’ range', () => {
    for (const theme of [DARK_THEME, LIGHT_THEME]) {
      const ramp = resolveColorRamp([3, 1, Number.NaN, 5], theme);
      expect([ramp.min, ramp.max]).toEqual([1, 5]);
      expect(ramp.colors.length).toBeGreaterThanOrEqual(2);
      expect(rampColor(1, ramp)).not.toBe(rampColor(5, ramp));
      expect(rampColor(3, ramp)).not.toBe(rampColor(5, ramp));
    }
  });

  it('blend between the colours given, and keep the end colours past the ends', () => {
    const ramp = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#000000', '#ffffff'] });
    expect(rampColor(0, ramp)).toBe('rgb(0,0,0)');
    expect(rampColor(5, ramp)).toBe('rgb(128,128,128)');
    expect(rampColor(10, ramp)).toBe('rgb(255,255,255)');
    expect(rampColor(-4, ramp)).toBe('rgb(0,0,0)');
    expect(rampColor(99, ramp)).toBe('rgb(255,255,255)');
    const three = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#ff0000', '#000000', '#0000ff'] });
    expect(rampColor(5, three)).toBe('rgb(0,0,0)');
    expect(rampColor(7.5, three)).toBe('rgb(0,0,128)');
  });

  it('take a range of their own, and ignore one that is no number', () => {
    expect(resolveColorRamp([2, 4], DARK_THEME, { min: 0, max: 10 })).toMatchObject({ min: 0, max: 10 });
    expect(resolveColorRamp([2, 4], DARK_THEME, { min: Number.NaN, max: Number.POSITIVE_INFINITY })).toMatchObject({ min: 2, max: 4 });
    expect(resolveColorRamp([], DARK_THEME)).toMatchObject({ min: 0, max: 1 });
  });

  it('are darker or lighter by how a face is lit', () => {
    const ramp = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#646464', '#646464'] });
    expect(rampColor(5, ramp, 1)).toBe('rgb(100,100,100)');
    expect(rampColor(5, ramp, 0.5)).toBe('rgb(50,50,50)');
    // Past full light a colour goes towards white, never past it.
    expect(rampColor(5, ramp, 1.2)).toBe('rgb(131,131,131)');
  });

  it('take a range given the wrong way round in order, and one end past the values’ other end', () => {
    expect(resolveColorRamp([0, 10], DARK_THEME, { min: 10, max: 5 })).toMatchObject({ min: 5, max: 10 });
    // The lowest colour from 20 up, and no value reaches 20: they all keep it.
    const ramp = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#000000', '#ffffff'], min: 20 });
    expect(ramp).toMatchObject({ min: 10, max: 20 });
    expect(rampColor(3, ramp)).toBe('rgb(0,0,0)');
    expect(rampColor(10, ramp)).toBe('rgb(0,0,0)');
  });

  it('blend over values as far apart as numbers go', () => {
    const ramp = resolveColorRamp([-1e308, 1e308], DARK_THEME, { colors: ['#000000', '#ffffff'] });
    expect(rampColor(-1e308, ramp)).toBe('rgb(0,0,0)');
    expect(rampColor(0, ramp)).toBe('rgb(128,128,128)');
    expect(rampColor(1e308, ramp)).toBe('rgb(255,255,255)');
  });

  it('change in steps between colours that cannot be read, one colour where one is given', () => {
    const named = resolveColorRamp([0, 10], DARK_THEME, { colors: ['red', 'blue'] });
    expect(rampColor(2, named)).toBe('red');
    expect(rampColor(8, named)).toBe('blue');
    const one = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#102030'] });
    expect(rampColor(0, one)).toBe('rgb(16,32,48)');
    expect(rampColor(10, one)).toBe('rgb(16,32,48)');
    const flat = resolveColorRamp([4, 4], DARK_THEME, { colors: ['#000000', '#ffffff'] });
    expect(rampColor(4, flat)).toBe('rgb(128,128,128)');
  });
});

describe('whether a point is in a shape of four corners', () => {
  it('is in it inside either of its two triangles, whichever way round its corners go', () => {
    expect(inQuad(5, 5, 0, 0, 10, 0, 10, 10, 0, 10)).toBe(true);
    expect(inQuad(5, 5, 0, 10, 10, 10, 10, 0, 0, 0)).toBe(true);
    expect(inQuad(15, 5, 0, 0, 10, 0, 10, 10, 0, 10)).toBe(false);
    expect(inQuad(5, -1, 0, 0, 10, 0, 10, 10, 0, 10)).toBe(false);
    // A shape with a dent: the point in the dent is outside.
    expect(inQuad(5, 1, 0, 0, 5, 4, 10, 0, 5, 10)).toBe(false);
    expect(inQuad(5, 6, 0, 0, 5, 4, 10, 0, 5, 10)).toBe(true);
  });

  it('is in none that is seen edge on, or that has a corner that is no number', () => {
    expect(inQuad(5, 0, 0, 0, 10, 0, 20, 0, 30, 0)).toBe(false);
    expect(inQuad(3, 3, 3, 3, 3, 3, 3, 3, 3, 3)).toBe(false);
    expect(inQuad(5, 5, Number.NaN, 0, 10, 0, 10, 10, 0, 10)).toBe(false);
    expect(inQuad(5, 5, 0, 0, 10, Number.NaN, 10, 10, 0, 10)).toBe(false);
    expect(inQuad(5, 5, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN)).toBe(false);
  });
});

describe('how far a point of the box is from the eye', () => {
  it('grows towards the sides the scene calls the back, at every turn', () => {
    for (let yaw = -170; yaw <= 180; yaw += 25) {
      const scene = computeScene3D(AREA, { yaw, pitch: 28 }, AXES, measure);
      const along = (u: number, v: number) => sceneDepth(scene, u, v, 0);
      expect(along(scene.uBack, 0.5), `x at yaw ${yaw}`).toBeGreaterThan(along(1 - scene.uBack, 0.5));
      expect(along(0.5, scene.vBack), `y at yaw ${yaw}`).toBeGreaterThan(along(0.5, 1 - scene.vBack));
      // What is higher is nearer an eye above the floor.
      expect(sceneDepth(scene, 0.5, 0.5, 1)).toBeLessThan(sceneDepth(scene, 0.5, 0.5, 0));
    }
  });
});

