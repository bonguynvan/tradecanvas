import type { Theme, View3D } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import { LABEL_GAP, LABEL_SIZE, fitText, fontOf, type Measure, type Rect } from './chartKit.js';

/** Where a 3D chart is seen from when nothing says: off the corner where both axes start, a little above the floor. */
export const DEFAULT_VIEW: Required<View3D> = { yaw: -35, pitch: 28 };

/** The box a 3D chart is drawn in: as deep as it is wide, and as high as the golden ratio makes it. */
const BOX_WIDTH = 1;
const BOX_DEPTH = 1;
const BOX_HEIGHT = 0.618;
/** Half the floor's diagonal: the furthest the box reaches to a side at any turn. */
const REACH = Math.hypot(BOX_WIDTH, BOX_DEPTH) / 2;
const RADIANS = Math.PI / 180;
/** An axis shorter than this on the screen, px, is seen end on: its labels would lie on each other. */
const MIN_AXIS_LENGTH = 24;
/** No tick's text is wider than this, px, or than this share of the chart. */
const MAX_TICK_WIDTH = 72;
const MAX_TICK_SHARE = 0.18;
/** A title takes no more than this share of its axis, so it keeps off the corners, where the next axis's ticks are. */
const TITLE_SHARE = 0.7;
/** Space kept between two labels, px: nearer, two numbers read as one. */
const LABEL_CLEARANCE = 4;
/** No more grid lines than this for an axis: every nth tick has one past it. */
const MAX_GRID_LINES = 12;
/**
 * Where else a tick's text may go when it would run into one already
 * written, as px further from its axis and px lower: at a corner of the box
 * two axes' ticks meet, and the last place is a line under the first.
 */
const LABEL_NUDGES = [[0, 0], [LABEL_GAP, 0], [LABEL_SIZE, 0], [0, LABEL_SIZE + LABEL_CLEARANCE]];
/** How far a label's place is from level before it is set to a side of its point, as a share of the way. */
const SIDEWAYS = 0.3;
/** How strongly a face turned from the light is still lit. */
const AMBIENT = 0.62;
/** Where the light is, as the eye sees it: over its left shoulder. To the left, up, and on the eye's side of the chart. */
const LIGHT = [-0.35, 0.85, -0.4];
const LIGHT_LENGTH = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
/** How much of its light a sheet's underside has: seen from below, it is in its own shade. */
const UNDERSIDE = 0.72;
const FACE_ALPHA = 0.03;

function wrapTurn(degrees: number): number {
  const turned = ((degrees % 360) + 360) % 360;
  return turned > 180 ? turned - 360 : turned;
}

/** The view with what it leaves out filled in: the yaw within one turn, the pitch between the floor and straight above. */
export function resolveView(view?: View3D): Required<View3D> {
  const yaw = view?.yaw !== undefined && Number.isFinite(view.yaw) ? view.yaw : DEFAULT_VIEW.yaw;
  const pitch = view?.pitch !== undefined && Number.isFinite(view.pitch) ? view.pitch : DEFAULT_VIEW.pitch;
  return { yaw: wrapTurn(yaw), pitch: Math.min(90, Math.max(0, pitch)) };
}

/** An axis of a 3D chart: where its ticks are along it (0 to 1) and what each says. */
export interface Axis3D {
  ticks: { at: number; text: string }[];
  title?: string;
}

export interface Axes3D {
  x: Axis3D;
  y: Axis3D;
  /** `zero`: where zero is up the values' axis (0 to 1), when it is inside it. */
  z: Axis3D & { zero?: number };
}

/** A text of a 3D chart's axes, where it goes on the screen. */
export interface SceneLabel {
  text: string;
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  /** How far the text is turned, radians: 0 for a tick, along its axis for a title. */
  angle: number;
  title: boolean;
}

/**
 * A 3D chart's box on the screen. A point of the box is (u, v, h): u along
 * x, v along y (the axis that runs back), h up the values, each from 0 to 1.
 * It is drawn without perspective, so the screen is a straight sum of them
 * (`sceneX`, `sceneY`), and so is how far a point is from the eye (`sceneDepth`).
 */
export interface Scene3D {
  view: Required<View3D>;
  /** Pixels to one side of the floor. */
  scale: number;
  ox: number;
  oy: number;
  ux: number;
  uy: number;
  vx: number;
  vy: number;
  hy: number;
  du: number;
  dv: number;
  dh: number;
  /** The end of x and of y that is further from the eye: what is drawn first. */
  uBack: 0 | 1;
  vBack: 0 | 1;
  /** The way to the light and the way to the eye, in the box's own directions: across, up, back. */
  light: [number, number, number];
  eye: [number, number, number];
  /** The floor and the two walls at the back, four corners each. */
  faces: number[][];
  /** The grid on them, a line each: x1, y1, x2, y2. */
  grid: number[][];
  /** Where zero is on the walls, when the values cross it. */
  zero: number[][];
  labels: SceneLabel[];
}

export function sceneX(scene: Scene3D, u: number, v: number): number {
  return scene.ox + scene.ux * u + scene.vx * v;
}

export function sceneY(scene: Scene3D, u: number, v: number, h: number): number {
  return scene.oy + scene.uy * u + scene.vy * v + scene.hy * h;
}

/** How far a point is from the eye: the greater, the further. Only good for telling two points of one scene apart. */
export function sceneDepth(scene: Scene3D, u: number, v: number, h: number): number {
  return scene.du * u + scene.dv * v + scene.dh * h;
}

/**
 * How strongly a face is lit, by the way it faces in the box's own
 * directions (across, up, back): 1 for one that lies flat, less for one
 * turned from the light, a little more for one turned to it. A face turned
 * from the eye is a sheet seen from below: its other side, in its shade.
 */
export function faceLight(scene: Scene3D, nx: number, ny: number, nz: number): number {
  // By hand: this runs for every cell of a surface in every frame of a drag.
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (!(length > 0)) return 1;
  const under = nx * scene.eye[0] + ny * scene.eye[1] + nz * scene.eye[2] < 0;
  const towards = (nx * scene.light[0] + ny * scene.light[1] + nz * scene.light[2]) / length;
  const lit = AMBIENT + ((1 - AMBIENT) * Math.max(0, under ? -towards : towards)) / scene.light[1];
  return under ? lit * UNDERSIDE : lit;
}

/** Whether a line from (px, py) straight to the right crosses the side from (ax, ay) to (bx, by). */
function crosses(px: number, py: number, ax: number, ay: number, bx: number, by: number): boolean {
  return ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax;
}

/**
 * Whether (px, py) is in the shape with these four corners, in the order
 * they are joined: it is when a line from it crosses an odd number of the
 * shape's sides. That holds for a shape with a dent and for one twisted
 * into a bow, as a cell of a surface seen at a slant can be, and it is what
 * the canvas fills. A shape seen edge on, or with a corner that is no
 * number, holds no point.
 */
export function inQuad(px: number, py: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): boolean {
  // A corner that is no number makes the sum one too.
  const sum = x0 + y0 + x1 + y1 + x2 + y2 + x3 + y3;
  if (sum !== sum) return false;
  let inside = false;
  if (crosses(px, py, x0, y0, x1, y1)) inside = !inside;
  if (crosses(px, py, x1, y1, x2, y2)) inside = !inside;
  if (crosses(px, py, x2, y2, x3, y3)) inside = !inside;
  if (crosses(px, py, x3, y3, x0, y0)) inside = !inside;
  return inside;
}

interface Point {
  x: number;
  y: number;
}

function labelBox(x: number, y: number, width: number, align: CanvasTextAlign, baseline: CanvasTextBaseline): Rect {
  const left = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  const top = baseline === 'top' ? y : baseline === 'bottom' ? y - LABEL_SIZE : y - LABEL_SIZE / 2;
  return { x: left, y: top, width, height: LABEL_SIZE };
}

const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width + LABEL_CLEARANCE && b.x < a.x + a.width + LABEL_CLEARANCE && a.y < b.y + b.height + LABEL_CLEARANCE && b.y < a.y + a.height + LABEL_CLEARANCE;

const inside = (box: Rect, area: Rect) => box.x >= area.x && box.y >= area.y && box.x + box.width <= area.x + area.width && box.y + box.height <= area.y + area.height;

/**
 * An axis's ticks and title along one edge of the box, on the side of it
 * away from the box: a tick's text beside its point, the title beyond the
 * ticks and turned along the edge.
 */
function labelAxis(axis: Axis3D, from: Point, to: Point, centre: Point, area: Rect, measure: Measure, taken: Rect[], labels: SceneLabel[]): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < MIN_AXIS_LENGTH) return;
  // Square to the edge, on the side the box is not.
  let nx = dy / length;
  let ny = -dx / length;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  if (nx * (mx - centre.x) + ny * (my - centre.y) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const align: CanvasTextAlign = nx > SIDEWAYS ? 'left' : nx < -SIDEWAYS ? 'right' : 'center';
  const baseline: CanvasTextBaseline = Math.abs(ny) < SIDEWAYS ? 'middle' : ny > 0 ? 'top' : 'bottom';
  // How far the ticks' texts reach from the edge: the title goes beyond them.
  let reach = 0;
  const own: Rect[] = [];
  for (const tick of axis.ticks) {
    if (!(tick.at >= 0 && tick.at <= 1) || tick.text === '') continue;
    const width = measure(tick.text, LABEL_SIZE);
    for (const [out, lower] of LABEL_NUDGES) {
      const x = from.x + dx * tick.at + nx * (LABEL_GAP + out);
      const y = from.y + dy * tick.at + ny * (LABEL_GAP + out) + lower;
      const box = labelBox(x, y, width, align, baseline);
      const crowded = own.some((other) => overlap(box, other));
      // In its own place it runs into its own axis's tick: one tick too many for the room. Set aside, the two would read as a pair.
      if (crowded && out === 0 && lower === 0) break;
      if (crowded || !inside(box, area) || taken.some((other) => overlap(box, other))) continue;
      own.push(box);
      labels.push({ text: tick.text, x, y, align, baseline, angle: 0, title: false });
      reach = Math.max(reach, out + Math.abs(nx) * width + Math.abs(ny) * (LABEL_SIZE + lower));
      break;
    }
  }
  taken.push(...own);
  const title = axis.title ? fitText(axis.title, length * TITLE_SHARE, measure) : '';
  if (title === '') return;
  const out = LABEL_GAP * 2 + reach + LABEL_SIZE / 2;
  // Along the edge, and never upside down: a title up a side reads from the bottom.
  let angle = Math.atan2(dy, dx);
  if (angle >= Math.PI / 2) angle -= Math.PI;
  else if (angle < -Math.PI / 2) angle += Math.PI;
  labels.push({ text: title, x: mx + nx * out, y: my + ny * out, align: 'center', baseline: 'middle', angle, title: true });
}

/** Every nth tick, so that no more than MAX_GRID_LINES have a line. */
function gridTicks(axis: Axis3D): number[] {
  const within = axis.ticks.map((tick) => tick.at).filter((at) => at >= 0 && at <= 1);
  const every = Math.max(1, Math.ceil(within.length / MAX_GRID_LINES));
  return within.filter((_, i) => i % every === 0);
}

/**
 * The box for a chart drawn in `area`, seen from `view`, with its axes'
 * texts placed. It is fitted to the widest it gets at any turn, so that it
 * stays one size while it is turned.
 */
export function computeScene3D(area: Rect, view: View3D | undefined, axes: Axes3D, measure: Measure): Scene3D {
  const seen = resolveView(view);
  const cos = Math.cos(seen.yaw * RADIANS);
  const sin = Math.sin(seen.yaw * RADIANS);
  const level = Math.cos(seen.pitch * RADIANS);
  const above = Math.sin(seen.pitch * RADIANS);

  const tickRoom = Math.max(0, Math.min(MAX_TICK_WIDTH, area.width * MAX_TICK_SHARE));
  const fitted = (axis: Axis3D): Axis3D => ({ title: axis.title, ticks: axis.ticks.map((tick) => ({ at: tick.at, text: fitText(tick.text, tickRoom, measure) })) });
  const x = fitted(axes.x);
  const y = fitted(axes.y);
  const z = fitted(axes.z);
  let widest = 0;
  for (const axis of [x, y, z]) for (const tick of axis.ticks) widest = Math.max(widest, measure(tick.text, LABEL_SIZE));
  const titleRoom = [x, y, z].some((axis) => axis.title) ? LABEL_GAP + LABEL_SIZE : 0;
  // Room for the texts on every side: a tick's beside the box, a title's beyond it.
  const marginX = LABEL_GAP + widest + titleRoom;
  const marginY = LABEL_GAP + LABEL_SIZE + titleRoom;
  const roomX = Math.max(1, area.width - marginX * 2);
  const roomY = Math.max(1, area.height - marginY * 2);
  const scale = Math.max(1, Math.min(roomX / (2 * REACH), roomY / (BOX_HEIGHT * level + 2 * REACH * above)));

  const cx = area.x + area.width / 2;
  const cy = area.y + area.height / 2;
  const ux = scale * BOX_WIDTH * cos;
  const vx = scale * BOX_DEPTH * sin;
  const uy = scale * BOX_WIDTH * sin * above;
  const vy = -scale * BOX_DEPTH * cos * above;
  const hy = -scale * BOX_HEIGHT * level;
  const ox = cx - (ux + vx) / 2;
  const oy = cy - (uy + vy + hy) / 2;
  const uBack = sin < 0 ? 1 : 0;
  const vBack = cos > 0 ? 1 : 0;
  const uFront = 1 - uBack;
  const vFront = 1 - vBack;
  const point = (u: number, v: number, h: number): Point => ({ x: ox + ux * u + vx * v, y: oy + uy * u + vy * v + hy * h });
  const flat = (points: readonly Point[]) => points.flatMap((p) => [p.x, p.y]);

  const faces = [
    flat([point(0, 0, 0), point(1, 0, 0), point(1, 1, 0), point(0, 1, 0)]),
    flat([point(0, vBack, 0), point(1, vBack, 0), point(1, vBack, 1), point(0, vBack, 1)]),
    flat([point(uBack, 0, 0), point(uBack, 1, 0), point(uBack, 1, 1), point(uBack, 0, 1)]),
  ];
  const grid: number[][] = [];
  for (const at of gridTicks(x)) grid.push(flat([point(at, 0, 0), point(at, 1, 0)]), flat([point(at, vBack, 0), point(at, vBack, 1)]));
  for (const at of gridTicks(y)) grid.push(flat([point(0, at, 0), point(1, at, 0)]), flat([point(uBack, at, 0), point(uBack, at, 1)]));
  const across = (h: number) => [flat([point(0, vBack, h), point(1, vBack, h)]), flat([point(uBack, 0, h), point(uBack, 1, h)])];
  for (const at of gridTicks(z)) grid.push(...across(at));
  const zero = axes.z.zero !== undefined && axes.z.zero > 0 && axes.z.zero < 1 ? across(axes.z.zero) : [];

  const labels: SceneLabel[] = [];
  const taken: Rect[] = [];
  const centre = { x: cx, y: cy };
  // The values up the upright edge furthest left, first: a floor axis ends at its foot, and gives way there.
  const side = point(uBack, vFront, 0).x <= point(uFront, vBack, 0).x ? [uBack, vFront] : [uFront, vBack];
  labelAxis(z, point(side[0], side[1], 0), point(side[0], side[1], 1), centre, area, measure, taken, labels);
  // Each floor axis along the floor's edge nearest the eye.
  labelAxis(x, point(0, vFront, 0), point(1, vFront, 0), centre, area, measure, taken, labels);
  labelAxis(y, point(uFront, 0, 0), point(uFront, 1, 0), centre, area, measure, taken, labels);

  return {
    view: seen,
    scale,
    ox,
    oy,
    ux,
    uy,
    vx,
    vy,
    hy,
    du: -BOX_WIDTH * sin * level,
    dv: BOX_DEPTH * cos * level,
    dh: -BOX_HEIGHT * above,
    uBack,
    vBack,
    // The light keeps its place by the eye: turned back into the box's own directions.
    light: [(LIGHT[0] * cos - LIGHT[2] * sin) / LIGHT_LENGTH, LIGHT[1] / LIGHT_LENGTH, (LIGHT[0] * sin + LIGHT[2] * cos) / LIGHT_LENGTH],
    eye: [level * sin, above, -level * cos],
    faces,
    grid,
    zero,
    labels,
  };
}

/** The box's sides, one to another: what a step along an axis is worth when working out which way a face points. */
export const BOX_SIZE = { width: BOX_WIDTH, depth: BOX_DEPTH, height: BOX_HEIGHT } as const;

function strokeLines(ctx: CanvasRenderingContext2D, lines: readonly number[][]): void {
  if (lines.length === 0) return;
  ctx.beginPath();
  for (const line of lines) {
    ctx.moveTo(line[0], line[1]);
    ctx.lineTo(line[2], line[3]);
  }
  ctx.stroke();
}

/** The floor, the walls at the back and the grid on them: what the chart's own drawing goes over. */
export function drawScene3D(ctx: CanvasRenderingContext2D, scene: Scene3D, theme: Theme): void {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  ctx.fillStyle = withAlpha(theme.text, FACE_ALPHA);
  ctx.strokeStyle = theme.axisLine;
  for (const face of scene.faces) {
    ctx.beginPath();
    ctx.moveTo(face[0], face[1]);
    for (let i = 2; i < face.length; i += 2) ctx.lineTo(face[i], face[i + 1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = theme.grid;
  strokeLines(ctx, scene.grid);
  ctx.strokeStyle = theme.textSecondary;
  strokeLines(ctx, scene.zero);
  ctx.restore();
}

/** The axes' texts: over the chart's own drawing, which may reach past the box's edges. */
export function drawSceneLabels(ctx: CanvasRenderingContext2D, scene: Scene3D, theme: Theme): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  for (const label of scene.labels) {
    ctx.fillStyle = label.title ? theme.textSecondary : theme.axisLabel;
    ctx.textAlign = label.align;
    ctx.textBaseline = label.baseline;
    if (label.angle === 0) {
      ctx.fillText(label.text, Math.round(label.x), Math.round(label.y));
      continue;
    }
    ctx.save();
    ctx.translate(label.x, label.y);
    ctx.rotate(label.angle);
    ctx.fillText(label.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
