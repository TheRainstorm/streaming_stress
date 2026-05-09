"use strict";

const DEFAULTS = {
  gridCells: 137,
  targetFps: 165,
  complexity: 1,
  motion: 20,
  pixelRatio: 1,
  renderWidth: 30,
  renderHeight: 50,
  internalScale: 100,
  paletteShift: 0,
  showHud: true,
  vSyncPace: false,
};

const LOCALES = {
  zh: {
    htmlLang: "zh-CN",
    appTitle: "Streaming Stress",
    gridCellsLabel: "网格密度",
    gridCellsDesc: "短边方向上的网格数量。默认 137 是你测出的高码率组合。",
    targetFpsLabel: "目标帧率",
    targetFpsDesc: "请求的渲染节奏。浏览器实际呈现仍受显示器、合成器和系统限制。",
    motionLabel: "运动强度",
    motionDesc: "帧与帧之间变化的强度。默认 20 可以最大化画面变化。",
    renderWidthLabel: "渲染宽度 %",
    renderWidthDesc: "Canvas 宽度占可用区域的百分比。默认 30 是你测出的 165 Hz 设置。",
    renderHeightLabel: "渲染高度 %",
    renderHeightDesc: "Canvas 高度占可用区域的百分比。默认 50 是你测出的 165 Hz 设置。",
    advancedSummary: "高级选项",
    complexityLabel: "复杂度",
    complexityDesc: "每个像素上的着色器噪声层数。默认 1 可把 GPU 成本压低。",
    pixelRatioLabel: "像素比上限",
    pixelRatioDesc: "限制高 DPI 下的渲染分辨率。默认 1 可以避免 2 带来的明显掉帧。",
    internalScaleLabel: "内部缩放 %",
    internalScaleDesc: "Canvas 内部实际渲染分辨率。降低它可以让更大的显示区域更省性能。",
    paletteShiftLabel: "色相偏移",
    paletteShiftDesc: "颜色相位偏移。对性能影响很小。",
    showHudLabel: "显示 HUD",
    vSyncPaceLabel: "按目标帧率限速",
    fullscreenButtonEnter: "全屏压力模式",
    fullscreenButtonExit: "退出全屏",
    shortcutHelp: "快捷键：F10 / F 进入全屏，Esc / Q 退出全屏。",
    statusInitializing: "正在初始化 WebGL...",
    statusReady: "WebGL 已就绪",
    statusErrorPrefix: "错误：",
    statusWebgl2Unavailable: "当前浏览器不支持 WebGL2。",
    hud: ({ frame, fps, targetFps, canvasWidth, canvasHeight, renderWidth, renderHeight, internalScale, gridCells, motion }) =>
      `帧 ${frame}\nFPS ${fps.toFixed(1)} / 目标 ${targetFps}\n画布 ${canvasWidth} x ${canvasHeight}\n区域 ${renderWidth}% x ${renderHeight}% 缩放 ${internalScale}%\n网格 ${gridCells} 运动 ${motion}`,
  },
  en: {
    htmlLang: "en",
    appTitle: "Streaming Stress",
    gridCellsLabel: "Grid cells",
    gridCellsDesc: "Cell count along the shorter side. The default 137 matches your high-bitrate preset.",
    targetFpsLabel: "Target FPS",
    targetFpsDesc: "Requested pacing. Actual presentation is still bounded by the display, compositor, and OS.",
    motionLabel: "Motion",
    motionDesc: "Frame-to-frame change intensity. The default 20 maximizes visual change.",
    renderWidthLabel: "Render width %",
    renderWidthDesc: "Canvas width as a percentage of the available area. Default 30 matches your 165 Hz test.",
    renderHeightLabel: "Render height %",
    renderHeightDesc: "Canvas height as a percentage of the available area. Default 50 matches your 165 Hz test.",
    advancedSummary: "Advanced",
    complexityLabel: "Complexity",
    complexityDesc: "Noise layers per pixel. Default 1 keeps GPU cost low.",
    pixelRatioLabel: "Pixel ratio cap",
    pixelRatioDesc: "Caps high-DPI render resolution. Default 1 avoids the FPS drop seen at 2.",
    internalScaleLabel: "Internal scale %",
    internalScaleDesc: "Actual render resolution inside the canvas. Lower values keep larger areas cheaper.",
    paletteShiftLabel: "Palette shift",
    paletteShiftDesc: "Color phase offset. Low performance impact.",
    showHudLabel: "Show HUD",
    vSyncPaceLabel: "Respect target FPS",
    fullscreenButtonEnter: "Fullscreen stress mode",
    fullscreenButtonExit: "Exit fullscreen",
    shortcutHelp: "Shortcuts: F10 / F enter fullscreen, Esc / Q exit fullscreen.",
    statusInitializing: "Initializing WebGL...",
    statusReady: "WebGL ready",
    statusErrorPrefix: "Error: ",
    statusWebgl2Unavailable: "WebGL2 is not available in this browser.",
    hud: ({ frame, fps, targetFps, canvasWidth, canvasHeight, renderWidth, renderHeight, internalScale, gridCells, motion }) =>
      `frame ${frame}\nFPS ${fps.toFixed(1)} / target ${targetFps}\ncanvas ${canvasWidth} x ${canvasHeight}\narea ${renderWidth}% x ${renderHeight}% scale ${internalScale}%\ngrid ${gridCells} motion ${motion}`,
  },
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

  vec3 color = palette(acc * 0.24 + h * 0.31 + h2 * 0.19 + uTime * 0.17);

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
const langButtons = Array.from(document.querySelectorAll("[data-lang]"));
const i18nNodes = Array.from(document.querySelectorAll("[data-i18n]"));

const state = { ...DEFAULTS };
const uiState = {
  language: "zh",
};
let gl;
let program;
let vao;
let uniforms;
let frame = 0;
let lastFrameTime = performance.now();
let fps = 0;
let nextAllowedFrame = 0;

function locale() {
  return LOCALES[uiState.language] || LOCALES.zh;
}

function translate(key) {
  return locale()[key] ?? LOCALES.zh[key] ?? key;
}

function applyLanguage(lang) {
  uiState.language = LOCALES[lang] ? lang : "zh";
  const current = locale();
  document.documentElement.lang = current.htmlLang;
  for (const node of i18nNodes) {
    const key = node.dataset.i18n;
    if (key === "fullscreenButton" || key === "statusInitializing") {
      continue;
    }
    const value = current[key];
    if (typeof value === "string") {
      node.textContent = value;
    }
  }
  for (const button of langButtons) {
    button.classList.toggle("active", button.dataset.lang === uiState.language);
  }
  fullscreenButton.textContent = document.fullscreenElement === stage
    ? current.fullscreenButtonExit
    : current.fullscreenButtonEnter;
  if (statusEl.dataset.mode === "static") {
    const statusKey = statusEl.dataset.statusKey || "statusReady";
    const statusKind = statusEl.dataset.statusKind || "text";
    if (statusKind === "error") {
      if (statusKey === "statusWebgl2Unavailable") {
        statusEl.textContent = current.statusErrorPrefix + current.statusWebgl2Unavailable;
      } else {
        statusEl.textContent = current.statusErrorPrefix + (statusEl.dataset.statusMessage || "");
      }
    } else {
      statusEl.textContent = current[statusKey] || current.statusReady;
    }
  }
}

function setStaticStatus(key, kind = "text", message = "") {
  statusEl.dataset.mode = "static";
  statusEl.dataset.statusKey = key;
  statusEl.dataset.statusKind = kind;
  statusEl.dataset.statusMessage = message;
  if (kind === "error") {
    if (key === "statusWebgl2Unavailable") {
      statusEl.textContent = translate("statusErrorPrefix") + translate("statusWebgl2Unavailable");
    } else {
      statusEl.textContent = translate("statusErrorPrefix") + message;
    }
  } else {
    statusEl.textContent = translate(key) || translate("statusReady");
  }
}

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
  const internalScale = Math.max(0.1, state.internalScale / 100);
  const width = Math.max(1, Math.floor(rect.width * ratio * internalScale));
  const height = Math.max(1, Math.floor(rect.height * ratio * internalScale));
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
    const text = translate("hud")({
      frame,
      fps,
      targetFps: Math.round(state.targetFps),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      renderWidth: Math.round(state.renderWidth),
      renderHeight: Math.round(state.renderHeight),
      internalScale: Math.round(state.internalScale),
      gridCells: Math.round(state.gridCells),
      motion: Math.round(state.motion),
    });
    hud.textContent = text;
    hud.style.display = state.showHud ? "block" : "none";
    statusEl.dataset.mode = "dynamic";
    statusEl.dataset.statusKey = "";
    statusEl.dataset.statusKind = "";
    statusEl.textContent = text;
  }
}

function updateFullscreenState() {
  const active = document.fullscreenElement === stage;
  app.classList.toggle("fullscreen", active);
  fullscreenButton.textContent = active
    ? translate("fullscreenButtonExit")
    : translate("fullscreenButtonEnter");
  resizeCanvas();
}

fullscreenButton.addEventListener("click", async () => {
  await toggleFullscreen();
});

document.addEventListener("fullscreenchange", updateFullscreenState);
document.addEventListener("keydown", async (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if (isTyping) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "f" || event.key === "F10") {
    event.preventDefault();
    await toggleFullscreen();
  }
  if (key === "escape" || key === "q") {
    if (document.fullscreenElement) {
      event.preventDefault();
      await document.exitFullscreen();
    }
  }
});
window.addEventListener("resize", resizeCanvas);

async function toggleFullscreen() {
  if (document.fullscreenElement === stage) {
    await document.exitFullscreen();
  } else {
    await stage.requestFullscreen({ navigationUI: "hide" });
  }
}

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
  for (const button of langButtons) {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.lang || "zh");
      updateFullscreenState();
      if (statusEl.dataset.mode === "dynamic") {
        const text = translate("hud")({
          frame,
          fps,
          targetFps: Math.round(state.targetFps),
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          renderWidth: Math.round(state.renderWidth),
          renderHeight: Math.round(state.renderHeight),
          internalScale: Math.round(state.internalScale),
          gridCells: Math.round(state.gridCells),
          motion: Math.round(state.motion),
        });
        hud.textContent = text;
        statusEl.textContent = text;
      }
    });
  }
  initControl("gridCells");
  initControl("targetFps");
  initControl("complexity");
  initControl("motion");
  initControl("pixelRatio");
  initControl("renderWidth");
  initControl("renderHeight");
  initControl("internalScale");
  initControl("paletteShift");
  applyLanguage("zh");
  setupWebGL();
  resizeCanvas();
  setStaticStatus("statusReady");
  fullscreenButton.textContent = translate("fullscreenButtonEnter");
  requestAnimationFrame(render);
} catch (error) {
  if (error instanceof Error && error.message === "WebGL2 is not available in this browser.") {
    setStaticStatus("statusWebgl2Unavailable", "error");
  } else {
    setStaticStatus(
      "statusGenericError",
      "error",
      error instanceof Error ? error.message : String(error),
    );
  }
}
