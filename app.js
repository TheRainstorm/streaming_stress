"use strict";

const DEFAULTS = {
  gridCells: 144,
  targetFps: 165,
  complexity: 7,
  motion: 12,
  pixelRatio: 1,
  renderWidth: 100,
  renderHeight: 100,
  paletteShift: 0,
  showHud: true,
  vSyncPace: false,
};

const vertexSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentSource = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uFrame;
uniform float uGridCells;
uniform float uComplexity;
uniform float uMotion;
uniform float uPaletteShift;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 palette(float t) {
  t += uPaletteShift / 360.0;
  vec3 a = vec3(0.52, 0.50, 0.48);
  vec3 b = vec3(0.48, 0.44, 0.50);
  vec3 c = vec3(1.00, 1.21, 1.37);
  vec3 d = vec3(0.02, 0.19, 0.37);
  return a + b * cos(6.2831853 * (c * t + d));
}

float finder(vec2 cell, float grid) {
  vec2 p0 = cell;
  vec2 p1 = vec2(grid - 9.0 - cell.x, cell.y);
  vec2 p2 = vec2(cell.x, grid - 9.0 - cell.y);
  float f = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 p = i == 0 ? p0 : (i == 1 ? p1 : p2);
    float outer = step(0.0, p.x) * step(0.0, p.y) * step(p.x, 9.0) * step(p.y, 9.0);
    float middle = step(2.0, p.x) * step(2.0, p.y) * step(p.x, 7.0) * step(p.y, 7.0);
    float inner = step(4.0, p.x) * step(4.0, p.y) * step(p.x, 5.0) * step(p.y, 5.0);
    f = max(f, outer - middle + inner);
  }
  return clamp(f, 0.0, 1.0);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float shortSide = min(uResolution.x, uResolution.y);
  float grid = max(1.0, uGridCells);
  vec2 gridPos = frag / shortSide * grid;
  vec2 cell = floor(gridPos);
  vec2 local = fract(gridPos);
  float tick = floor(uFrame * max(1.0, uMotion));

  float h = hash12(cell + tick * vec2(0.071, 0.113));
  float h2 = hash12(cell.yx * 1.73 + tick * vec2(0.137, 0.067));
  float shapeA = step(local.x, h);
  float shapeB = step(local.y, h2);
  float diagonal = step(abs(local.x - local.y), 0.18 + 0.24 * h2);
  float ring = step(0.18 + 0.22 * h, length(local - 0.5));
  float bits = mod(floor(h * 31.0) + floor(h2 * 47.0) + floor(cell.x) + floor(cell.y) + tick, 2.0);
  float signal = mix(shapeA, shapeB, bits);
  signal = mix(signal, diagonal, step(0.66, h));
  signal = mix(signal, ring, step(0.74, h2));

  float acc = signal;
  for (int i = 0; i < 10; i++) {
    if (float(i) >= uComplexity) {
      break;
    }
    float fi = float(i) + 1.0;
    vec2 p = frag * (0.011 * fi + 0.003) + vec2(tick * (0.13 + fi * 0.017), tick * (0.09 + fi * 0.019));
    float n = hash12(floor(p) + fi * 19.19);
    float micro = step(fract(p.x + n), fract(p.y * 1.37 + n * 0.71));
    acc = mod(acc + micro + step(0.91, n), 2.0);
  }

  float finderMask = finder(cell, grid);
  vec3 color = palette(acc * 0.24 + h * 0.31 + h2 * 0.19 + uTime * 0.17);
  color = mix(color, vec3(0.0), finderMask);
  color = mix(color, vec3(1.0), finderMask * step(0.42, fract(cell.x * 0.5 + cell.y * 0.5)));

  float border = step(local.x, 0.08) + step(local.y, 0.08);
  color = mix(color, vec3(1.0) - color, clamp(border, 0.0, 1.0) * 0.35);
  outColor = vec4(color, 1.0);
}
`;

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const canvas = document.getElementById("stressCanvas");
const hud = document.getElementById("hud");
const statusEl = document.getElementById("status");
const fullscreenButton = document.getElementById("fullscreenButton");

const state = { ...DEFAULTS };
let gl;
let program;
let vao;
let uniforms;
let frame = 0;
let lastFrameTime = performance.now();
let fps = 0;
let nextAllowedFrame = 0;

function initControl(id, parser = Number) {
  const slider = document.getElementById(id);
  const input = document.getElementById(`${id}Value`);
  slider.value = state[id];
  input.value = state[id];

  const apply = (raw) => {
    const parsed = parser(raw);
    if (!Number.isFinite(parsed)) {
      input.value = state[id];
      return;
    }
    const min = Number(slider.min);
    const max = Number(slider.max);
    const step = Number(slider.step) || 1;
    const clamped = Math.min(max, Math.max(min, parsed));
    const rounded = Math.round(clamped / step) * step;
    state[id] = Number(rounded.toFixed(3));
    slider.value = state[id];
    input.value = state[id];
    resizeCanvas();
  };

  slider.addEventListener("input", () => apply(slider.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      input.blur();
    }
  });
  input.addEventListener("blur", () => apply(input.value));
}

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
  }
  return shader;
}

function createProgram() {
  const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const nextProgram = gl.createProgram();
  gl.attachShader(nextProgram, vertex);
  gl.attachShader(nextProgram, fragment);
  gl.linkProgram(nextProgram);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(nextProgram) || "Program link failed");
  }
  return nextProgram;
}

function setupWebGL() {
  gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.");
  }

  program = createProgram();
  gl.useProgram(program);
  uniforms = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    time: gl.getUniformLocation(program, "uTime"),
    frame: gl.getUniformLocation(program, "uFrame"),
    gridCells: gl.getUniformLocation(program, "uGridCells"),
    complexity: gl.getUniformLocation(program, "uComplexity"),
    motion: gl.getUniformLocation(program, "uMotion"),
    paletteShift: gl.getUniformLocation(program, "uPaletteShift"),
  };

  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
}

function resizeCanvas() {
  if (!gl) {
    return;
  }
  canvas.style.width = `${state.renderWidth}%`;
  canvas.style.height = `${state.renderHeight}%`;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, state.pixelRatio);
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }
}

function render(now) {
  requestAnimationFrame(render);
  if (state.vSyncPace && now < nextAllowedFrame) {
    return;
  }
  const targetInterval = 1000 / Math.max(1, state.targetFps);
  nextAllowedFrame = now + targetInterval;

  resizeCanvas();
  frame += 1;
  const dt = now - lastFrameTime;
  lastFrameTime = now;
  const instant = dt > 0 ? 1000 / dt : 0;
  fps = fps === 0 ? instant : fps * 0.92 + instant * 0.08;

  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.time, now * 0.001);
  gl.uniform1f(uniforms.frame, frame);
  gl.uniform1f(uniforms.gridCells, state.gridCells);
  gl.uniform1f(uniforms.complexity, state.complexity);
  gl.uniform1f(uniforms.motion, state.motion);
  gl.uniform1f(uniforms.paletteShift, state.paletteShift);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  if (state.showHud && frame % 10 === 0) {
    const text = `frame ${frame}
fps ${fps.toFixed(1)} / target ${state.targetFps}
canvas ${canvas.width} x ${canvas.height}
area ${state.renderWidth}% x ${state.renderHeight}%
grid ${state.gridCells} complexity ${state.complexity}`;
    hud.textContent = text;
    statusEl.textContent = text;
  }
}

function updateFullscreenState() {
  const active = document.fullscreenElement === stage;
  app.classList.toggle("fullscreen", active);
  fullscreenButton.textContent = active ? "Exit fullscreen stress mode" : "Fullscreen stress mode";
  resizeCanvas();
}

fullscreenButton.addEventListener("click", async () => {
  if (document.fullscreenElement === stage) {
    await document.exitFullscreen();
  } else {
    await stage.requestFullscreen({ navigationUI: "hide" });
  }
});

document.addEventListener("fullscreenchange", updateFullscreenState);
window.addEventListener("resize", resizeCanvas);

document.getElementById("showHud").checked = state.showHud;
document.getElementById("showHud").addEventListener("change", (event) => {
  state.showHud = event.target.checked;
  hud.style.display = state.showHud ? "block" : "none";
});
document.getElementById("vSyncPace").checked = state.vSyncPace;
document.getElementById("vSyncPace").addEventListener("change", (event) => {
  state.vSyncPace = event.target.checked;
});

try {
  initControl("gridCells");
  initControl("targetFps");
  initControl("complexity");
  initControl("motion");
  initControl("pixelRatio");
  initControl("renderWidth");
  initControl("renderHeight");
  initControl("paletteShift");
  setupWebGL();
  resizeCanvas();
  statusEl.textContent = "WebGL ready";
  requestAnimationFrame(render);
} catch (error) {
  statusEl.textContent = error instanceof Error ? error.message : String(error);
}
