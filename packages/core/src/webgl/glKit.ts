/** A linked program, its vertex array, and the locations it was asked for. */
export interface Program {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniforms: Map<string, WebGLUniformLocation | null>;
  attribs: Map<string, number>;
}

/** The few WebGL 2 chores every program here needs: compile, link, bind, set. */
export class GlKit {
  constructor(readonly gl: WebGL2RenderingContext) {}

  program(vertexSource: string, fragmentSource: string, attribs: readonly string[]): Program {
    const gl = this.gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('WebGL: no shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`WebGL shader: ${log}`);
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('WebGL: no program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WebGL program: ${gl.getProgramInfoLog(program)}`);
    }
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('WebGL: no vertex array');
    const locations = new Map<string, number>();
    for (const name of attribs) locations.set(name, gl.getAttribLocation(program, name));
    return { program, vao, uniforms: new Map(), attribs: locations };
  }

  buffer(): WebGLBuffer {
    const b = this.gl.createBuffer();
    if (!b) throw new Error('WebGL: no buffer');
    return b;
  }

  use(p: Program): Program {
    this.gl.useProgram(p.program);
    this.gl.bindVertexArray(p.vao);
    return p;
  }

  /** A float attribute read from the bound buffer; per instance unless `divisor` is 0. */
  attrib(p: Program, name: string, size: number, stride: number, offset: number, divisor = 1): void {
    const loc = p.attribs.get(name);
    if (loc === undefined || loc < 0) return;
    const gl = this.gl;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(loc, divisor);
  }

  int(p: Program, name: string, v: number): void {
    this.gl.uniform1i(this.loc(p, name), v);
  }

  float(p: Program, name: string, v: number): void {
    this.gl.uniform1f(this.loc(p, name), v);
  }

  vec2(p: Program, name: string, x: number, y: number): void {
    this.gl.uniform2f(this.loc(p, name), x, y);
  }

  vec4(p: Program, name: string, v: readonly number[]): void {
    this.gl.uniform4f(this.loc(p, name), v[0], v[1], v[2], v[3]);
  }

  loc(p: Program, name: string): WebGLUniformLocation | null {
    if (!p.uniforms.has(name)) p.uniforms.set(name, this.gl.getUniformLocation(p.program, name));
    return p.uniforms.get(name) ?? null;
  }

  deleteProgram(p: Program): void {
    this.gl.deleteVertexArray(p.vao);
    this.gl.deleteProgram(p.program);
  }

  /** Scissor to a box in device pixels (y down), widened to whole pixels. False when nothing is left. */
  scissor(x0: number, y0: number, x1: number, y1: number, canvasWidth: number, canvasHeight: number): boolean {
    const left = Math.max(0, Math.floor(x0));
    const top = Math.max(0, Math.floor(y0));
    const right = Math.min(canvasWidth, Math.ceil(x1));
    const bottom = Math.min(canvasHeight, Math.ceil(y1));
    if (!(right > left && bottom > top)) return false;
    const gl = this.gl;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(left, canvasHeight - bottom, right - left, bottom - top);
    return true;
  }
}
