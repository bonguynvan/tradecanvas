/**
 * Shaders for drawing recorded Canvas 2D: strokes, filled polygons and
 * discs, in device pixels. Each fragment works out how much of its pixel the
 * shape covers, as Canvas 2D antialiasing does, times how much of it the
 * clip lets through.
 */

const COMMON = `#version 300 es
precision highp float;
uniform vec2 u_canvas;
uniform vec4 u_clip;

vec4 toClip(vec2 dev) {
  return vec4(dev.x / u_canvas.x * 2.0 - 1.0, 1.0 - dev.y / u_canvas.y * 2.0, 0.0, 1.0);
}
`;

const CORNER = `
vec2 corner(int k) {
  if (k == 0) return vec2(0.0, 0.0);
  if (k == 1 || k == 4) return vec2(1.0, 0.0);
  if (k == 2 || k == 3) return vec2(0.0, 1.0);
  return vec2(1.0, 1.0);
}
const vec4 NOWHERE = vec4(-2.0, -2.0, 0.0, 1.0);
`;

const PIXEL = `
// This fragment's pixel centre in device pixels, y down.
vec2 pixelCentre() { return vec2(gl_FragCoord.x, u_canvas.y - gl_FragCoord.y); }

// The share of the pixel centred at p inside the clip.
float clipCoverage(vec2 p) {
  vec2 lo = p - 0.5;
  vec2 c = clamp(min(lo + 1.0, u_clip.zw) - max(lo, u_clip.xy), 0.0, 1.0);
  return c.x * c.y;
}
`;

/**
 * A stroke, one segment per instance: the segment's two points and two
 * neighbours either side (x, y, w, length along; w 1 drawn, 0 a neighbour
 * only, -1 none). The quad covers the segment and its round ends.
 */
export const STROKE_VS = `${COMMON}${CORNER}
uniform float u_hw;
in vec4 a_p0;
in vec4 a_p1;
in vec4 a_p2;
in vec4 a_p3;
in vec4 a_p4;
in vec4 a_p5;
flat out vec4 v_p0;
flat out vec4 v_p1;
flat out vec4 v_p2;
flat out vec4 v_p3;
flat out vec4 v_p4;
flat out vec4 v_p5;

void main() {
  v_p0 = a_p0; v_p1 = a_p1; v_p2 = a_p2; v_p3 = a_p3; v_p4 = a_p4; v_p5 = a_p5;
  if (a_p2.z < 0.5 || a_p3.z < 0.5) { gl_Position = NOWHERE; return; }
  vec2 a = a_p2.xy;
  vec2 b = a_p3.xy;
  vec2 d = b - a;
  float len = length(d);
  vec2 dir = len > 0.0 ? d / len : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  float m = u_hw + 1.0;
  vec2 cr = corner(gl_VertexID % 6);
  vec2 pos = mix(a - dir * m, b + dir * m, cr.x) + n * mix(-m, m, cr.y);
  gl_Position = toClip(pos);
}
`;

/**
 * A stroke is the union of its segments, round where they join: each pixel
 * is drawn once, by the nearest segment of those around it, with the
 * coverage of the nearest distance. The line's own ends take its cap. A
 * dashed line goes segment by segment, its pattern counted along the line.
 */
export const STROKE_FS = `${COMMON}${PIXEL}
uniform vec4 u_color;
uniform float u_hw;
uniform int u_cap;
uniform vec4 u_dash;
flat in vec4 v_p0;
flat in vec4 v_p1;
flat in vec4 v_p2;
flat in vec4 v_p3;
flat in vec4 v_p4;
flat in vec4 v_p5;
out vec4 outColor;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float l2 = dot(ab, ab);
  float t = l2 > 0.0 ? clamp(dot(p - a, ab) / l2, 0.0, 1.0) : 0.0;
  return length(p - a - t * ab);
}

bool joined(vec4 a, vec4 b) { return a.z > -0.5 && b.z > -0.5; }

// The share of a pixel at distance d from the centre line inside a line hw either side.
float across(float d) { return clamp(min(u_hw, d + 0.5) - max(-u_hw, d - 0.5), 0.0, 1.0); }

// The share of [s - 0.5, s + 0.5] inside [lo, hi].
float span(float s, float lo, float hi) { return clamp(min(s + 0.5, hi) - max(s - 0.5, lo), 0.0, 1.0); }

// The share of [s - 0.5, s + 0.5] on a dash.
float onDash(float s) {
  float period = u_dash.x + u_dash.y + u_dash.z + u_dash.w;
  float base = s - mod(s, period);
  float on = 0.0;
  for (int k = -1; k <= 1; k++) {
    float p0 = base + float(k) * period;
    on += span(s, p0, p0 + u_dash.x);
    on += span(s, p0 + u_dash.x + u_dash.y, p0 + u_dash.x + u_dash.y + u_dash.z);
  }
  return min(on, 1.0);
}

void main() {
  vec2 p = pixelCentre();
  float clipCov = clipCoverage(p);
  if (clipCov <= 0.0) discard;
  vec2 a = v_p2.xy;
  vec2 b = v_p3.xy;
  vec2 ab = b - a;
  float len = length(ab);
  vec2 dir = len > 0.0 ? ab / len : vec2(1.0, 0.0);
  float along = dot(p - a, dir);
  float perp = abs(dot(p - a, vec2(-dir.y, dir.x)));
  bool startEnd = v_p1.z < -0.5;
  bool finalEnd = v_p4.z < -0.5;

  float cov;
  if (u_dash.x + u_dash.y > 0.0) {
    cov = across(perp) * onDash(v_p2.w + along) * span(along, 0.0, len);
  } else {
    float self = segDist(p, a, b);
    float nearest = self;
    if (joined(v_p0, v_p1)) { float d = segDist(p, v_p0.xy, v_p1.xy); if (d <= self) discard; nearest = min(nearest, d); }
    if (joined(v_p1, v_p2)) { float d = segDist(p, v_p1.xy, v_p2.xy); if (d <= self) discard; nearest = min(nearest, d); }
    if (joined(v_p3, v_p4)) { float d = segDist(p, v_p3.xy, v_p4.xy); if (d < self) discard; nearest = min(nearest, d); }
    if (joined(v_p4, v_p5)) { float d = segDist(p, v_p4.xy, v_p5.xy); if (d < self) discard; nearest = min(nearest, d); }
    cov = across(nearest);
    // Past an end of the line: its cap, square-ended (butt or square) or round.
    float before = startEnd ? -along : -1e9;
    float after = finalEnd ? along - len : -1e9;
    if (u_cap != 1 && (before > -0.5 || after > -0.5)) {
      float reach = u_cap == 2 ? u_hw : 0.0;
      float lo = startEnd ? -reach : -1e9;
      float hi = finalEnd ? len + reach : 1e9;
      cov = across(perp) * span(along, lo, hi);
    }
  }
  if (cov <= 0.0) discard;
  outColor = u_color * (cov * clipCov);
}
`;

/**
 * Filled polygons as spans (polygonSpans.ts), one per instance: between x0
 * and x1 the fill lies between two straight lines, a and b, whichever is on
 * top. The quad covers the span's box.
 */
export const SPAN_VS = `${COMMON}${CORNER}
in vec2 a_x;
in vec4 a_ab;
in vec2 a_ends;
flat out vec2 v_x;
flat out vec4 v_ab;
flat out vec2 v_ends;

void main() {
  v_x = a_x;
  v_ab = a_ab;
  v_ends = a_ends;
  float lo = min(min(a_ab.x, a_ab.y), min(a_ab.z, a_ab.w));
  float hi = max(max(a_ab.x, a_ab.y), max(a_ab.z, a_ab.w));
  vec2 cr = corner(gl_VertexID % 6);
  gl_Position = toClip(mix(vec2(floor(a_x.x), floor(lo) - 1.0), vec2(ceil(a_x.y), ceil(hi) + 1.0), cr));
}
`;

/**
 * The share of the pixel inside the span: across, the part of its column
 * between the two lines (at the pixel's centre); along, whole pixels by
 * their centre between neighbouring spans (so no seam where they meet), the
 * part inside at the polygon's own two ends. Then the paint: a colour, or a
 * linear gradient of up to four stops blended unpremultiplied, as Canvas 2D
 * blends them.
 */
export const SPAN_FS = `${COMMON}${PIXEL}
uniform int u_kind;
uniform vec4 u_color;
uniform vec4 u_line;
uniform vec4 u_offsets;
uniform int u_stops;
uniform vec4 u_stop0;
uniform vec4 u_stop1;
uniform vec4 u_stop2;
uniform vec4 u_stop3;
flat in vec2 v_x;
flat in vec4 v_ab;
flat in vec2 v_ends;
out vec4 outColor;

vec4 stopColor(int i) {
  if (i == 0) return u_stop0;
  if (i == 1) return u_stop1;
  if (i == 2) return u_stop2;
  return u_stop3;
}

vec4 gradient(vec2 p) {
  vec2 g = u_line.zw - u_line.xy;
  float l2 = dot(g, g);
  // A gradient of no length paints nothing.
  if (l2 <= 0.0) return vec4(0.0);
  float t = dot(p - u_line.xy, g) / l2;
  vec4 c = stopColor(0);
  for (int i = 1; i < 4; i++) {
    if (i >= u_stops) break;
    float o0 = u_offsets[i - 1];
    float o1 = u_offsets[i];
    if (t >= o1) c = stopColor(i);
    else if (t > o0) { c = mix(stopColor(i - 1), stopColor(i), (t - o0) / max(o1 - o0, 1e-6)); break; }
    else break;
  }
  return vec4(c.rgb * c.a, c.a);
}

void main() {
  vec2 p = pixelCentre();
  float x0 = v_x.x;
  float x1 = v_x.y;
  float left = v_ends.x > 0.5 ? clamp(p.x + 0.5 - x0, 0.0, 1.0) : (p.x >= x0 ? 1.0 : 0.0);
  float right = v_ends.y > 0.5 ? clamp(x1 - (p.x - 0.5), 0.0, 1.0) : (p.x < x1 ? 1.0 : 0.0);
  float along = v_ends.x > 0.5 && v_ends.y > 0.5
    ? clamp(min(p.x + 0.5, x1) - max(p.x - 0.5, x0), 0.0, 1.0)
    : min(left, right);
  float t = clamp((clamp(p.x, x0, x1) - x0) / max(x1 - x0, 1e-6), 0.0, 1.0);
  float ya = mix(v_ab.x, v_ab.y, t);
  float yb = mix(v_ab.z, v_ab.w, t);
  float across = clamp(min(p.y + 0.5, max(ya, yb)) - max(p.y - 0.5, min(ya, yb)), 0.0, 1.0);
  float cov = along * across * clipCoverage(p);
  if (cov <= 0.0) discard;
  vec4 color = u_kind == 1 ? gradient(p) : u_color;
  outColor = color * cov;
}
`;

/** Discs, one per instance: centre, radius, premultiplied colour. */
export const DISC_VS = `${COMMON}${CORNER}
in vec3 a_disc;
in vec4 a_color;
flat out vec3 v_disc;
flat out vec4 v_color;
void main() {
  v_disc = a_disc;
  v_color = a_color;
  float m = a_disc.z + 1.0;
  gl_Position = toClip(mix(a_disc.xy - m, a_disc.xy + m, corner(gl_VertexID % 6)));
}
`;

export const DISC_FS = `${COMMON}${PIXEL}
flat in vec3 v_disc;
flat in vec4 v_color;
out vec4 outColor;
void main() {
  vec2 p = pixelCentre();
  float cov = clamp(v_disc.z + 0.5 - length(p - v_disc.xy), 0.0, 1.0) * clipCoverage(p);
  if (cov <= 0.0) discard;
  outColor = v_color * cov;
}
`;
