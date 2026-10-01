import type { GaugeOptions, GaugeZone, Theme } from '@tradecanvas/commons';

const DEG_TO_RAD = Math.PI / 180;
/** Default sweep: 240°, open at the bottom (canvas angles, clockwise from +x). */
const DEFAULT_START_DEG = 150;
const DEFAULT_SWEEP_DEG = 240;
/** Narrower arcs degenerate into a huge, off-canvas dial. */
const MIN_SWEEP_DEG = 90;
/** Ring thickness as a share of the centre-line radius. */
const DEFAULT_THICKNESS = 0.14;
/** Angular gap between neighbouring zones. */
const ZONE_GAP_RAD = 1.6 * DEG_TO_RAD;
/** Opacity of the part of a zone the value has not reached. */
const REST_ALPHA = 0.22;
const EDGE_PAD = 8;
/** Room reserved below the ring for the min/max labels. */
const LABEL_SPACE = 18;
/** Room reserved above the ring when zone labels are drawn outside it. */
const ZONE_LABEL_TOP = 16;
/** Rough width of one label character, for reserving room before a canvas exists. */
const LABEL_CHAR_PX = 6.5;
const MINOR_TICKS = 20;
const MAJOR_EVERY = 5;
/** Below this inner radius the ticks would crowd the number: skip them. */
const MIN_TICK_RADIUS = 28;

export interface GaugeLayout {
  cx: number;
  cy: number;
  /** Centre line of the ring. */
  radius: number;
  /** Ring stroke width. */
  thickness: number;
  startAngle: number;
  endAngle: number;
  min: number;
  max: number;
  /** Where the value text sits (centre of the main number). */
  valueY: number;
  valueSize: number;
  /** Lowest y the centre text may reach without meeting the end labels or the edge. */
  textBottom: number;
}

function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}

function defaultValueFormat(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  if (Number.isInteger(v)) return v.toFixed(0);
  return v.toFixed(1);
}

/** Start in [0, 2π) and a sweep in [MIN_SWEEP, 2π], whatever the caller passed. */
function normaliseArc(options: GaugeOptions): { start: number; sweep: number } {
  const startDeg = Number.isFinite(options.startAngle) ? (options.startAngle as number) : DEFAULT_START_DEG;
  const endDeg = Number.isFinite(options.endAngle) ? (options.endAngle as number) : startDeg + DEFAULT_SWEEP_DEG;
  let sweepDeg = endDeg - startDeg;
  // An end before the start wraps once; more than a full turn is a full turn.
  if (sweepDeg <= 0) sweepDeg = ((sweepDeg % 360) + 360) % 360 || 360;
  sweepDeg = clamp(sweepDeg, MIN_SWEEP_DEG, 360);
  const start = (((startDeg % 360) + 360) % 360) * DEG_TO_RAD;
  return { start, sweep: sweepDeg * DEG_TO_RAD };
}

/** Unit-circle bounding box of an arc from `a0` to `a1` (radians, 0 < a1 − a0 ≤ 2π). */
function arcBounds(a0: number, a1: number): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Math.min(Math.cos(a0), Math.cos(a1));
  let maxX = Math.max(Math.cos(a0), Math.cos(a1));
  let minY = Math.min(Math.sin(a0), Math.sin(a1));
  let maxY = Math.max(Math.sin(a0), Math.sin(a1));
  // Every cardinal direction the sweep passes through extends the box.
  for (let k = Math.ceil(a0 / (Math.PI / 2)); k * (Math.PI / 2) <= a1; k++) {
    const a = k * (Math.PI / 2);
    minX = Math.min(minX, Math.cos(a));
    maxX = Math.max(maxX, Math.cos(a));
    minY = Math.min(minY, Math.sin(a));
    maxY = Math.max(maxY, Math.sin(a));
  }
  return { minX, maxX, minY, maxY };
}

/** Side room the outside zone labels need, estimated from their length. */
function zoneLabelPad(options: GaugeOptions): number {
  if (options.showZoneLabels !== true || !options.zones) return 0;
  const longest = options.zones.reduce((n, z) => Math.max(n, z.label?.length ?? 0), 0);
  return longest > 0 ? longest * LABEL_CHAR_PX + 12 : 0;
}

/**
 * Fit the gauge into `width × height`: the ring is scaled so the arc (plus
 * the min/max labels and any zone labels) fills the box, then centred. Pure,
 * so it can be tested without a canvas.
 */
export function computeGaugeLayout(width: number, height: number, options: GaugeOptions): GaugeLayout {
  const min = Number.isFinite(options.min) ? (options.min as number) : 0;
  let max = Number.isFinite(options.max) ? (options.max as number) : 100;
  // A collapsed range would make every angle NaN; give it a usable span.
  if (!(max - min > Math.abs(min) * 1e-9)) max = min + Math.max(1, Math.abs(min) * 1e-6);

  const { start, sweep } = normaliseArc(options);
  const startAngle = start;
  const endAngle = start + sweep;

  const thicknessRatio = clamp(options.thickness ?? DEFAULT_THICKNESS, 0.04, 0.5);
  const box = arcBounds(startAngle, endAngle);
  // The number lives inside the ring; a shallow arc (≤ 180°) still needs the
  // centre line low enough to hold it.
  const bottom = Math.max(box.maxY, 0.18);

  const sidePad = zoneLabelPad(options);
  const topPad = sidePad > 0 ? ZONE_LABEL_TOP : 0;
  const availW = Math.max(1, width - 2 * EDGE_PAD - 2 * sidePad);
  const availH = Math.max(1, height - 2 * EDGE_PAD - LABEL_SPACE - topPad);
  const outer = 1 + thicknessRatio / 2;
  const radius = Math.max(8, Math.min(availW / ((box.maxX - box.minX) * outer), availH / ((bottom - box.minY) * outer)));
  const thickness = radius * thicknessRatio;

  const usedH = (bottom - box.minY) * radius * outer + LABEL_SPACE + topPad;
  const cx = width / 2 - ((box.maxX + box.minX) / 2) * radius;
  const cy = (height - usedH) / 2 + topPad - box.minY * radius * outer;

  const inner = radius - thickness / 2;
  const valueSize = Math.max(11, Math.round(inner * 0.46));
  // Sit the number on the centre for open-bottom gauges, a little above the
  // chord for half-circles so it stays inside the arc.
  const valueY = box.maxY > 0.3 ? cy - valueSize * 0.12 : cy - valueSize * 0.55;
  // End labels hang below the lower arc end; centre text must stay above them.
  const lowerEnd = Math.max(Math.sin(startAngle), Math.sin(endAngle));
  const endLabelTop = lowerEnd > 0.2 ? cy + lowerEnd * radius + thickness / 2 + 2 : Infinity;
  const textBottom = Math.min(height - EDGE_PAD, endLabelTop);

  return { cx, cy, radius, thickness, startAngle, endAngle, min, max, valueY, valueSize, textBottom };
}

export function gaugeValueToAngle(value: number, layout: GaugeLayout): number {
  const t = Number.isFinite(value) ? clamp((value - layout.min) / (layout.max - layout.min), 0, 1) : 0;
  return layout.startAngle + (layout.endAngle - layout.startAngle) * t;
}

/** The zone containing `value` (last match wins on shared edges), if any. */
export function gaugeZoneAt(value: number, zones: readonly GaugeZone[] | undefined): GaugeZone | undefined {
  if (!zones || !Number.isFinite(value)) return undefined;
  let hit: GaugeZone | undefined;
  for (const zone of zones) {
    if (value >= zone.from && value <= zone.to) hit = zone;
  }
  return hit;
}

export interface GaugeBand {
  a0: number;
  a1: number;
  color: string;
  /** Track bands fill gaps between zones and stay at full opacity. */
  track: boolean;
}

/**
 * The ring split into bands: zones in angle order (overlaps trimmed so each
 * angle is painted once), with track bands wherever no zone reaches.
 */
export function gaugeRingBands(layout: GaugeLayout, zones: readonly GaugeZone[] | undefined, trackColor: string): GaugeBand[] {
  const zoneBands = (zones ?? [])
    .map((z) => ({ a0: gaugeValueToAngle(z.from, layout), a1: gaugeValueToAngle(z.to, layout), color: z.color, track: false }))
    .filter((b) => b.a1 > b.a0)
    .sort((p, q) => p.a0 - q.a0);
  const bands: GaugeBand[] = [];
  let cursor = layout.startAngle;
  for (const band of zoneBands) {
    if (band.a1 <= cursor) continue; // fully covered by an earlier zone
    if (band.a0 > cursor + 1e-9) bands.push({ a0: cursor, a1: band.a0, color: trackColor, track: true });
    bands.push({ ...band, a0: Math.max(band.a0, cursor) });
    cursor = band.a1;
  }
  if (cursor < layout.endAngle - 1e-9) bands.push({ a0: cursor, a1: layout.endAngle, color: trackColor, track: true });
  return bands;
}

function strokeArc(ctx: CanvasRenderingContext2D, layout: GaugeLayout, a0: number, a1: number, color: string): void {
  if (a1 <= a0) return;
  ctx.beginPath();
  ctx.arc(layout.cx, layout.cy, layout.radius, a0, a1, false);
  ctx.lineWidth = layout.thickness;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * Round cap beyond one end of the ring. Opaque caps are full discs
 * (overlapping the stroke hides the anti-aliased seam); translucent ones are
 * half discs so nothing doubles up.
 */
function drawEndCap(
  ctx: CanvasRenderingContext2D,
  layout: GaugeLayout,
  angle: number,
  color: string,
  alpha: number,
  side: 'start' | 'end',
): void {
  const x = layout.cx + Math.cos(angle) * layout.radius;
  const y = layout.cy + Math.sin(angle) * layout.radius;
  // The ring runs clockwise: the start cap faces back along it, the end cap forward.
  const from = side === 'start' ? angle - Math.PI : angle;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, layout.thickness / 2, from, from + (alpha >= 1 ? Math.PI * 2 : Math.PI), false);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Zones bright up to the value and dim beyond it, on a track where no zone is. */
function drawRing(
  ctx: CanvasRenderingContext2D,
  layout: GaugeLayout,
  zones: readonly GaugeZone[] | undefined,
  valueAngle: number,
  trackColor: string,
  progressColor: string,
): void {
  const bands = gaugeRingBands(layout, zones, trackColor);
  const hasZones = bands.some((b) => !b.track);

  bands.forEach((band, i) => {
    // Gaps only where two zones meet.
    const gapBefore = i > 0 && !band.track && !bands[i - 1].track ? ZONE_GAP_RAD / 2 : 0;
    const gapAfter = i < bands.length - 1 && !band.track && !bands[i + 1].track ? ZONE_GAP_RAD / 2 : 0;
    const from = band.a0 + gapBefore;
    const to = band.a1 - gapAfter;
    if (band.track) {
      strokeArc(ctx, layout, from, to, band.color);
      return;
    }
    ctx.globalAlpha = REST_ALPHA;
    strokeArc(ctx, layout, from, to, band.color);
    ctx.globalAlpha = 1;
    strokeArc(ctx, layout, from, Math.min(to, valueAngle), band.color);
  });

  // Without zones the progress runs in one colour over the track.
  if (!hasZones) strokeArc(ctx, layout, layout.startAngle, valueAngle, progressColor);

  const started = valueAngle > layout.startAngle + 1e-9;
  const finished = valueAngle >= layout.endAngle - 1e-9;
  const capStyle = (band: GaugeBand, reached: boolean): [string, number] => {
    if (band.track) return [!hasZones && reached ? progressColor : trackColor, 1];
    return [band.color, reached ? 1 : REST_ALPHA];
  };
  const [startColor, startAlpha] = capStyle(bands[0], started);
  const [endColor, endAlpha] = capStyle(bands[bands.length - 1], finished);
  drawEndCap(ctx, layout, layout.startAngle, startColor, startAlpha, 'start');
  drawEndCap(ctx, layout, layout.endAngle, endColor, endAlpha, 'end');
}

function drawTicks(ctx: CanvasRenderingContext2D, layout: GaugeLayout, color: string): void {
  const inner = layout.radius - layout.thickness / 2;
  if (inner < MIN_TICK_RADIUS) return;
  const gap = Math.max(4, layout.thickness * 0.45);
  ctx.strokeStyle = color;
  ctx.lineCap = 'butt';
  for (let i = 0; i <= MINOR_TICKS; i++) {
    const major = i % MAJOR_EVERY === 0;
    const a = layout.startAngle + ((layout.endAngle - layout.startAngle) * i) / MINOR_TICKS;
    const r0 = inner - gap;
    const r1 = r0 - (major ? Math.max(6, layout.thickness * 0.55) : Math.max(3, layout.thickness * 0.3));
    ctx.globalAlpha = major ? 0.55 : 0.3;
    ctx.lineWidth = major ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(layout.cx + Math.cos(a) * r0, layout.cy + Math.sin(a) * r0);
    ctx.lineTo(layout.cx + Math.cos(a) * r1, layout.cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A knob riding on the ring at the value, ringed in the background colour. */
function drawMarker(ctx: CanvasRenderingContext2D, layout: GaugeLayout, angle: number, color: string, bg: string): void {
  const x = layout.cx + Math.cos(angle) * layout.radius;
  const y = layout.cy + Math.sin(angle) * layout.radius;
  ctx.beginPath();
  ctx.arc(x, y, layout.thickness * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(2, layout.thickness * 0.32);
  ctx.strokeStyle = bg;
  ctx.stroke();
}

/** Classic needle from a small hub to just inside the ring. */
function drawNeedle(ctx: CanvasRenderingContext2D, layout: GaugeLayout, angle: number, color: string, bg: string): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tip = layout.radius - layout.thickness * 0.9;
  const tail = Math.max(6, layout.thickness * 0.6);
  const half = Math.max(1.5, layout.thickness * 0.14);
  ctx.beginPath();
  ctx.moveTo(layout.cx + cos * tip, layout.cy + sin * tip);
  ctx.lineTo(layout.cx - sin * half - cos * tail, layout.cy + cos * half - sin * tail);
  ctx.lineTo(layout.cx + sin * half - cos * tail, layout.cy - cos * half - sin * tail);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(layout.cx, layout.cy, Math.max(4, layout.thickness * 0.42), 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = bg;
  ctx.stroke();
}

/** Set the font at `size`, shrunk until `text` fits `maxWidth`; 0 when it can't fit legibly. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  size: number,
  family: string,
  maxWidth: number,
  minSize: number,
): number {
  ctx.font = `${weight} ${size}px ${family}`;
  const width = ctx.measureText(text).width;
  if (width <= maxWidth) return size;
  const fitted = Math.floor((size * maxWidth) / width);
  if (fitted < minSize) return 0;
  ctx.font = `${weight} ${fitted}px ${family}`;
  return fitted;
}

function drawCentre(
  ctx: CanvasRenderingContext2D,
  layout: GaugeLayout,
  valueText: string,
  label: string | undefined,
  zone: GaugeZone | undefined,
  theme: Theme,
  needle: boolean,
): void {
  const family = theme.font.family;
  const inner = layout.radius - layout.thickness / 2;
  // Text stays inside the ticks: about 1.3 × the inner radius wide.
  const maxWidth = inner * 1.3;
  const minSize = theme.font.sizeSmall;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const valueSize = fitFont(ctx, valueText, '600', layout.valueSize, family, maxWidth, minSize);
  if (valueSize === 0) return;
  // With a needle the number moves below the hub, out of the needle's sweep,
  // but never onto the end labels.
  const valueY = needle
    ? Math.min(layout.cy + valueSize * 0.8, layout.textBottom - valueSize / 2)
    : layout.valueY;
  ctx.fillStyle = theme.text;
  ctx.fillText(valueText, layout.cx, valueY);
  const small = Math.max(minSize, Math.round(valueSize * 0.26));

  if (zone?.label && !needle) {
    const text = zone.label.toUpperCase();
    if (fitFont(ctx, text, '600', small, family, maxWidth * 0.9, minSize) > 0) {
      ctx.fillStyle = zone.color;
      ctx.fillText(text, layout.cx, valueY - valueSize * 0.78);
    }
  }

  if (label) {
    const y = valueY + valueSize * 0.72;
    if (y + small / 2 <= layout.textBottom && fitFont(ctx, label, '400', small, family, maxWidth, minSize) > 0) {
      ctx.fillStyle = theme.textSecondary;
      ctx.fillText(label, layout.cx, y);
    }
  }
}

function drawEndLabels(ctx: CanvasRenderingContext2D, layout: GaugeLayout, format: (v: number) => string, theme: Theme): void {
  ctx.fillStyle = theme.textSecondary;
  ctx.font = `${theme.font.sizeSmall + 1}px ${theme.font.family}`;
  const offset = layout.thickness / 2 + 6;
  for (const [angle, value] of [[layout.startAngle, layout.min], [layout.endAngle, layout.max]] as const) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = layout.cx + cos * layout.radius;
    const y = layout.cy + sin * layout.radius;
    if (sin > 0.2) {
      // Lower half: hang the label under the end of the arc.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(format(value), x, y + offset);
    } else {
      // Elsewhere: push it outward along the radius, clear of the ring.
      ctx.textAlign = cos < -0.2 ? 'right' : cos > 0.2 ? 'left' : 'center';
      ctx.textBaseline = sin < -0.2 ? 'bottom' : 'middle';
      ctx.fillText(format(value), x + cos * offset, y + sin * offset);
    }
  }
}

function drawZoneLabels(ctx: CanvasRenderingContext2D, layout: GaugeLayout, zones: readonly GaugeZone[], theme: Theme): void {
  ctx.fillStyle = theme.textSecondary;
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.textBaseline = 'middle';
  const r = layout.radius + layout.thickness / 2 + 8;
  for (const zone of zones) {
    if (!zone.label) continue;
    const mid = (clamp(zone.from, layout.min, layout.max) + clamp(zone.to, layout.min, layout.max)) / 2;
    const a = gaugeValueToAngle(mid, layout);
    const cos = Math.cos(a);
    ctx.textAlign = cos < -0.2 ? 'right' : cos > 0.2 ? 'left' : 'center';
    ctx.fillText(zone.label, layout.cx + cos * r, layout.cy + Math.sin(a) * r);
  }
}

export function renderGauge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: GaugeOptions,
  theme: Theme,
  displayValue: number,
): void {
  if (width <= 0 || height <= 0) return;

  const layout = computeGaugeLayout(width, height, options);
  const finite = Number.isFinite(displayValue);
  const value = finite ? clamp(displayValue, layout.min, layout.max) : layout.min;
  const angle = gaugeValueToAngle(value, layout);
  const zone = finite ? gaugeZoneAt(value, options.zones) : undefined;
  const needle = options.pointer === 'needle';
  const format = options.valueFormat ?? defaultValueFormat;
  const accent = zone?.color ?? options.needleColor ?? theme.lineColor;

  ctx.save();
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  drawRing(ctx, layout, options.zones, angle, options.trackColor ?? theme.grid, accent);
  drawTicks(ctx, layout, theme.textSecondary);

  // No pointer for a missing value: the dial shows "—" instead of lying at min.
  if (finite) {
    if (needle) drawNeedle(ctx, layout, angle, options.needleColor ?? theme.text, theme.background);
    else drawMarker(ctx, layout, angle, accent, theme.background);
  }

  if (options.showValue !== false) {
    drawCentre(ctx, layout, finite ? format(value) : '—', options.label, zone, theme, needle);
  }
  drawEndLabels(ctx, layout, format, theme);
  if (options.showZoneLabels === true && options.zones?.length) {
    drawZoneLabels(ctx, layout, options.zones, theme);
  }
  ctx.restore();
}
