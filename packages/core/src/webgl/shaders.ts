/**
 * The shaders. Each draws axis-aligned rectangles, one instance per
 * rectangle under the bars, bar (or pixel column when zoomed out), placed on
 * device pixels by the
 * same rules as `charts/pixelGrid.ts`, so GPU bars line up with what the 2D
 * layer draws over them (crosshair, drawings). `floor(v + 0.5)` is used for
 * rounding: GLSL's `round()` may round halves either way, `Math.round` does not.
 */

const HEADER = `#version 300 es
precision highp float;
uniform vec2 u_canvas;
uniform float u_dpr;
uniform int u_log;
uniform int u_invert;
uniform float u_yA;
uniform float u_yB;
uniform float u_base;
uniform float u_logMin;
uniform float u_logK;
uniform float u_top;
uniform float u_bottom;
out vec4 v_color;

// A price (relative to u_base) to a CSS-pixel y, as priceToYMapper does.
float cssY(float rel) {
  if (u_log == 1) {
    float v = (log(max(u_base + rel, 2.220446e-16)) - u_logMin) * u_logK;
    return u_invert == 1 ? u_top + v : u_bottom - v;
  }
  return u_yA + rel * u_yB;
}

float snap(float v) { return floor(v + 0.5); }

vec4 toClip(vec2 dev) {
  return vec4(dev.x / u_canvas.x * 2.0 - 1.0, 1.0 - dev.y / u_canvas.y * 2.0, 0.0, 1.0);
}

// The corners of a quad as two triangles.
vec2 corner(int k) {
  if (k == 0) return vec2(0.0, 0.0);
  if (k == 1 || k == 4) return vec2(1.0, 0.0);
  if (k == 2 || k == 3) return vec2(0.0, 1.0);
  return vec2(1.0, 1.0);
}

// Nothing to draw: every vertex at one point off the canvas.
const vec4 NOWHERE = vec4(-2.0, -2.0, 0.0, 1.0);
`;

/** Candles, a bar per instance: 6 vertices for the wick, then 6 for the body. */
export const CANDLE_BARS_VS = `${HEADER}
in vec4 a_ohlc;
in vec2 a_vd;
uniform float u_x0;
uniform float u_unit;
uniform float u_wick;
uniform float u_body;
uniform vec4 u_upBody;
uniform vec4 u_downBody;
uniform vec4 u_upWick;
uniform vec4 u_downWick;

void main() {
  int vid = gl_VertexID % 12;
  vec2 cr = corner(vid % 6);
  bool up = a_vd.y > 0.5;
  float cx = (u_x0 + float(gl_InstanceID) * u_unit) * u_dpr;
  float wickLeft = snap(cx - u_wick * 0.5);
  float left;
  float width;
  float top;
  float height;
  if (vid < 6) {
    float h = snap(cssY(a_ohlc.y) * u_dpr);
    float l = snap(cssY(a_ohlc.z) * u_dpr);
    left = wickLeft;
    width = u_wick;
    top = min(h, l);
    height = max(abs(l - h), 1.0);
    v_color = up ? u_upWick : u_downWick;
  } else {
    float o = snap(cssY(a_ohlc.x) * u_dpr);
    float c = snap(cssY(a_ohlc.w) * u_dpr);
    left = wickLeft - (u_body - u_wick) * 0.5;
    width = u_body;
    top = min(o, c);
    height = max(abs(c - o), u_wick);
    v_color = up ? u_upBody : u_downBody;
  }
  gl_Position = toClip(vec2(left + cr.x * width, top + cr.y * height));
}
`;

/** Volume, a bar per instance, under the candle bodies. */
export const VOLUME_BARS_VS = `${HEADER}
in vec4 a_ohlc;
in vec2 a_vd;
uniform float u_x0;
uniform float u_unit;
uniform float u_wick;
uniform float u_body;
uniform float u_volBottom;
uniform float u_volScale;
uniform vec4 u_volUp;
uniform vec4 u_volDown;

void main() {
  vec2 cr = corner(gl_VertexID % 6);
  float cx = (u_x0 + float(gl_InstanceID) * u_unit) * u_dpr;
  float left = snap(cx - u_wick * 0.5) - (u_body - u_wick) * 0.5;
  float bottom = snap(u_volBottom * u_dpr);
  float top = snap((u_volBottom - a_vd.x * u_volScale) * u_dpr);
  if (bottom - top < 1.0) { gl_Position = NOWHERE; v_color = vec4(0.0); return; }
  v_color = a_vd.y > 0.5 ? u_volUp : u_volDown;
  gl_Position = toClip(vec2(left + cr.x * u_body, top + cr.y * (bottom - top)));
}
`;

/**
 * Zoomed out: a pixel column per instance, from the CPU (x, high, low,
 * volume, up), reaching the next column with no gap.
 */
export const CANDLE_COLUMNS_VS = `${HEADER}
in vec4 a_col;
in float a_up;
uniform vec4 u_upBody;
uniform vec4 u_downBody;

void main() {
  vec2 cr = corner(gl_VertexID % 6);
  float left = snap(a_col.x * u_dpr);
  float width = max(1.0, snap((a_col.x + 1.0) * u_dpr) - left);
  float t = snap(cssY(a_col.y) * u_dpr);
  float b = snap(cssY(a_col.z) * u_dpr);
  v_color = a_up > 0.5 ? u_upBody : u_downBody;
  gl_Position = toClip(vec2(left + cr.x * width, min(t, b) + cr.y * max(abs(b - t), 1.0)));
}
`;

export const VOLUME_COLUMNS_VS = `${HEADER}
in vec4 a_col;
in float a_up;
uniform float u_volBottom;
uniform float u_volScale;
uniform vec4 u_volUp;
uniform vec4 u_volDown;

void main() {
  vec2 cr = corner(gl_VertexID % 6);
  float left = snap(a_col.x * u_dpr);
  float width = max(1.0, snap((a_col.x + 1.0) * u_dpr) - left);
  float bottom = snap(u_volBottom * u_dpr);
  float top = snap((u_volBottom - a_col.w * u_volScale) * u_dpr);
  if (bottom - top < 1.0) { gl_Position = NOWHERE; v_color = vec4(0.0); return; }
  v_color = a_up > 0.5 ? u_volUp : u_volDown;
  gl_Position = toClip(vec2(left + cr.x * width, top + cr.y * (bottom - top)));
}
`;

/**
 * Rectangles under the bars (grid lines, session shading, break dashes): one
 * per instance, in CSS pixels (left, top, right, bottom), in a premultiplied
 * colour. The quad covers every device pixel the rectangle touches; the
 * fragment shader works out how much of each it covers, as Canvas 2D
 * antialiases an edge at a fractional pixel ratio.
 */
export const RECT_VS = `${HEADER}
in vec4 a_rect;
in vec4 a_color;
flat out vec4 v_rect;

void main() {
  vec2 cr = corner(gl_VertexID % 6);
  v_rect = a_rect * u_dpr;
  v_color = a_color;
  gl_Position = toClip(mix(floor(v_rect.xy), ceil(v_rect.zw), cr));
}
`;

/**
 * The colour times the share of the pixel covered. For the grid (u_union),
 * coverage goes out as alpha, so that where lines cross the blend gives the
 * union of their coverage, as one 2D path does.
 */
export const RECT_FS = `#version 300 es
precision highp float;
uniform vec2 u_canvas;
uniform int u_union;
in vec4 v_color;
flat in vec4 v_rect;
out vec4 outColor;

void main() {
  // This pixel's top-left corner in device pixels, y down.
  vec2 p = vec2(floor(gl_FragCoord.x), u_canvas.y - floor(gl_FragCoord.y) - 1.0);
  vec2 c = clamp(min(p + 1.0, v_rect.zw) - max(p, v_rect.xy), 0.0, 1.0);
  float coverage = c.x * c.y;
  outColor = u_union == 1 ? vec4(v_color.rgb * coverage, coverage) : v_color * coverage;
}
`;

/**
 * Every bar program fills with its (premultiplied) colour, clipped to the
 * plot: a pixel the plot's edge cuts gets the share inside, as a 2D clip
 * antialiases an edge at a fractional pixel ratio.
 */
export const FILL_FS = `#version 300 es
precision highp float;
uniform vec2 u_canvas;
uniform vec4 u_clip;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec2 p = vec2(floor(gl_FragCoord.x), u_canvas.y - floor(gl_FragCoord.y) - 1.0);
  vec2 c = clamp(min(p + 1.0, u_clip.zw) - max(p, u_clip.xy), 0.0, 1.0);
  outColor = v_color * (c.x * c.y);
}
`;
