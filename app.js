"use strict";

const SYMBOL_TILE_DIM = 8;

const DEFAULTS = {
  symbolColumns: 64,
  symbolRows: 64,
  colorBits: 2,
  shapeBits: 4,
  tilePixels: 1,
  targetFps: 200,
  motion: 10,
  paletteShift: 0,
  showHud: true,
  vSyncPace: true,
  paused: false,
  symbolGridLinked: true,
};

const LOCALES = {
  zh: {
    htmlLang: "zh-CN",
    appTitle: "Streaming Stress",
    symbolColumnsLabel: "符号列数",
    symbolColumnsDesc: "图案宽度，以 symbol 为单位。默认 64。滑块范围 16-128，输入框可设置更大值。",
    symbolRowsLabel: "符号行数",
    symbolRowsDesc: "图案高度，以 symbol 为单位。默认 64。默认与列数联动。",
    symbolGridLinkLabel: "联动行列",
    colorBitsLabel: "颜色位数 k",
    colorBitsDesc: "颜色类型数量为 2^k。k=0 表示 1 种颜色，默认 k=2。",
    shapeBitsLabel: "形状位数",
    shapeBitsDesc: "形状数量为 2^n，强烈影响码率。默认 n=4，即 16 种形状。",
    tilePixelsLabel: "Tile 像素大小",
    tilePixelsDesc: "8x8 symbol 内部每个 tile 的像素边长。默认 1；0 表示按屏幕高度 50% 自动计算。",
    targetFpsLabel: "目标帧率",
    targetFpsDesc: "请求的渲染节奏，默认 200。浏览器实际呈现仍受显示器、合成器和系统限制。",
    motionLabel: "运动强度",
    motionDesc: "帧与帧之间变化的强度。默认 10。",
    advancedSummary: "高级选项",
    paletteShiftLabel: "色相偏移",
    paletteShiftDesc: "颜色相位偏移。对性能影响很小。",
    showHudLabel: "显示 HUD",
    vSyncPaceLabel: "按目标帧率限速",
    pausedLabel: "暂停图案变化",
    fullscreenButtonEnter: "全屏压力模式",
    fullscreenButtonExit: "退出全屏",
    shortcutHelp: "快捷键：空格暂停/继续，F10 / F 进入全屏，Esc / Q 退出全屏。",
    statusInitializing: "正在初始化 WebGL...",
    statusReady: "WebGL 已就绪",
    statusErrorPrefix: "错误：",
    statusWebgl2Unavailable: "当前浏览器不支持 WebGL2。",
    hud: ({ frame, fps, targetFps, canvasWidth, canvasHeight, symbolColumns, symbolRows, tilePixels, colorBits, colorCount, shapeBits, shapeCount, bitsPerSymbol, dataPerFrameText, estimatedBitrateText, motion, paused }) =>
      `状态：${paused ? "暂停" : "运行"} | 帧 ${frame}\n帧率：${fps.toFixed(1)} / ${targetFps} FPS | 估计码率：${estimatedBitrateText}\n数据：${dataPerFrameText}/帧 | ${bitsPerSymbol} bit/symbol\n网格：${symbolColumns} x ${symbolRows} symbols | 画布：${canvasWidth} x ${canvasHeight}px\n编码：颜色 ${colorCount} (k=${colorBits}) | 形状 ${shapeCount} (n=${shapeBits})\n渲染：tile ${tilePixels}px | 运动 ${motion}`,
  },
  en: {
    htmlLang: "en",
    appTitle: "Streaming Stress",
    symbolColumnsLabel: "Symbol columns",
    symbolColumnsDesc: "Pattern width in symbols. Default 64. Slider range is 16-128; manual input can exceed it.",
    symbolRowsLabel: "Symbol rows",
    symbolRowsDesc: "Pattern height in symbols. Default 64. Linked to columns by default.",
    symbolGridLinkLabel: "Link rows/columns",
    colorBitsLabel: "Color bits k",
    colorBitsDesc: "Number of color types is 2^k. k=0 means one color, default k=2.",
    shapeBitsLabel: "Shape bits",
    shapeBitsDesc: "Shape count is 2^n and strongly affects bitrate. Default n=4, meaning 16 shapes.",
    tilePixelsLabel: "Tile pixels",
    tilePixelsDesc: "Pixel size of each tile inside an 8x8 symbol. Default 1; 0 auto-calculates from 50% screen height.",
    targetFpsLabel: "Target FPS",
    targetFpsDesc: "Requested pacing, default 200. Actual presentation is still bounded by the display, compositor, and OS.",
    motionLabel: "Motion",
    motionDesc: "Frame-to-frame change intensity. Default 10.",
    advancedSummary: "Advanced",
    paletteShiftLabel: "Palette shift",
    paletteShiftDesc: "Color phase offset. Low performance impact.",
    showHudLabel: "Show HUD",
    vSyncPaceLabel: "Respect target FPS",
    pausedLabel: "Pause pattern",
    fullscreenButtonEnter: "Fullscreen stress mode",
    fullscreenButtonExit: "Exit fullscreen",
    shortcutHelp: "Shortcuts: Space pause/resume, F10 / F enter fullscreen, Esc / Q exit fullscreen.",
    statusInitializing: "Initializing WebGL...",
    statusReady: "WebGL ready",
    statusErrorPrefix: "Error: ",
    statusWebgl2Unavailable: "WebGL2 is not available in this browser.",
    hud: ({ frame, fps, targetFps, canvasWidth, canvasHeight, symbolColumns, symbolRows, tilePixels, colorBits, colorCount, shapeBits, shapeCount, bitsPerSymbol, dataPerFrameText, estimatedBitrateText, motion, paused }) =>
      `Status: ${paused ? "paused" : "running"} | frame ${frame}\nFPS: ${fps.toFixed(1)} / ${targetFps} | Estimated bitrate: ${estimatedBitrateText}\nData: ${dataPerFrameText}/frame | ${bitsPerSymbol} bit/symbol\nGrid: ${symbolColumns} x ${symbolRows} symbols | Canvas: ${canvasWidth} x ${canvasHeight}px\nEncoding: colors ${colorCount} (k=${colorBits}) | shapes ${shapeCount} (n=${shapeBits})\nRender: tile ${tilePixels}px | motion ${motion}`,
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
precision highp int;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uFrame;
uniform ivec2 uSymbolGrid;
uniform int uColorBits;
uniform int uShapeBits;
uniform int uTilePixels;
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

bool shapeOn(int shape, ivec2 p) {
  int x = p.x;
  int y = p.y;
  if (shape == 0) return x >= 2 && x <= 5 && y >= 2 && y <= 5;
  if (shape == 1) return x == 3 || x == 4;
  if (shape == 2) return y == 3 || y == 4;
  if (shape == 3) return x == y || x == y + 1 || x + 1 == y;
  if (shape == 4) return x + y == 7 || x + y == 6 || x + y == 8;
  if (shape == 5) return x == 3 || x == 4 || y == 3 || y == 4;
  if (shape == 6) return abs(x - y) <= 1 || abs(x + y - 7) <= 1;
  if (shape == 7) return (x >= 1 && x <= 6 && (y == 1 || y == 6)) || (y >= 1 && y <= 6 && (x == 1 || x == 6));
  if (shape == 8) return (x + y) % 2 == 0;
  if (shape == 9) return x <= y;
  if (shape == 10) return x + y >= 7;
  if (shape == 11) return (x <= 2 && y <= 2) || (x >= 5 && y >= 5) || (x >= 3 && x <= 4 && y >= 3 && y <= 4);
  if (shape == 12) return x <= 1 || x >= 6 || (y >= 3 && y <= 4);
  if (shape == 13) return y <= 1 || y >= 6 || (x >= 3 && x <= 4);
  if (shape == 14) return abs(x - 3) + abs(y - 3) <= 3;
  return (x <= 1 && y >= 5) || (x >= 5 && y <= 1) || (x >= 3 && x <= 4) || (y >= 3 && y <= 4);
}

vec3 symbolColor(int colorIndex, int colorCount) {
  float t = float(colorIndex) / max(1.0, float(colorCount - 1));
  return palette(t);
}

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  int tilePixels = max(1, uTilePixels);
  ivec2 tileCoord = pixel / tilePixels;
  ivec2 symbolCoord = tileCoord / 8;
  ivec2 localTile = tileCoord - symbolCoord * 8;

  if (symbolCoord.x < 0 || symbolCoord.y < 0 || symbolCoord.x >= uSymbolGrid.x || symbolCoord.y >= uSymbolGrid.y) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float tick = floor(uFrame * max(1.0, uMotion));
  float h = hash12(vec2(symbolCoord) + tick * vec2(0.071, 0.113));
  float h2 = hash12(vec2(symbolCoord.yx) * 1.73 + tick * vec2(0.137, 0.067));
  int colorBits = clamp(uColorBits, 0, 8);
  int colorCount = 1 << colorBits;
  int shapeBits = clamp(uShapeBits, 0, 4);
  int shapeCount = 1 << shapeBits;
  int colorIndex = int(floor(h * float(colorCount))) % colorCount;
  int shapeIndex = int(floor(h2 * float(shapeCount))) % shapeCount;
  bool on = shapeOn(shapeIndex, localTile);

  vec3 fg = symbolColor(colorIndex, colorCount);
  vec3 bg = vec3(0.015, 0.016, 0.020);
  vec3 off = mix(bg, vec3(1.0) - fg, 0.16);
  vec3 color = on ? fg : off;

  ivec2 pixelInTile = pixel - tileCoord * tilePixels;
  bool tileEdge = tilePixels >= 3 && (pixelInTile.x == 0 || pixelInTile.y == 0);
  if (tileEdge) {
    color *= 0.72;
  }

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
  if (statusEl.dataset.mode === "dynamic") {
    updateHudText();
  } else if (statusEl.dataset.mode === "static") {
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

  const sync = (value) => {
    state[id] = value;
    slider.value = value;
    input.value = value;
  };

  const apply = (raw, clampToSlider = true) => {
    const parsed = parser(raw);
    if (!Number.isFinite(parsed)) {
      input.value = state[id];
      return;
    }
    const min = Number(slider.min);
    const max = Number(slider.max);
    const step = Number(slider.step) || 1;
    const allowManualOutOfRange = !clampToSlider && (id === "symbolColumns" || id === "symbolRows");
    const clamped = allowManualOutOfRange ? Math.max(1, parsed) : Math.min(max, Math.max(min, parsed));
    const rounded = Math.round(clamped / step) * step;
    const value = Number(rounded.toFixed(3));
    sync(value);
    if (state.symbolGridLinked && (id === "symbolColumns" || id === "symbolRows")) {
      syncControl(id === "symbolColumns" ? "symbolRows" : "symbolColumns", value);
    }
    resizeCanvas();
  };

  slider.addEventListener("input", () => apply(slider.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      input.blur();
    }
  });
  input.addEventListener("blur", () => apply(input.value, false));
}

function syncControl(id, value) {
  const slider = document.getElementById(id);
  const input = document.getElementById(`${id}Value`);
  state[id] = value;
  slider.value = value;
  input.value = value;
}

function getResolvedTilePixels() {
  if (state.tilePixels > 0) {
    return Math.max(1, Math.round(state.tilePixels));
  }
  const ratio = window.devicePixelRatio || 1;
  const targetHeight = window.innerHeight * 0.5 * ratio;
  return Math.max(1, Math.floor(targetHeight / (Math.max(1, state.symbolRows) * SYMBOL_TILE_DIM)));
}

function getResolvedColorBits() {
  return Math.max(0, Math.min(8, Math.round(state.colorBits)));
}

function getResolvedColorCount() {
  return 2 ** getResolvedColorBits();
}

function getResolvedShapeBits() {
  return Math.max(0, Math.min(4, Math.round(state.shapeBits)));
}

function getResolvedShapeCount() {
  return 2 ** getResolvedShapeBits();
}

function getBitsPerSymbol() {
  return getResolvedColorBits() + getResolvedShapeBits();
}

function getDataPerFrameBits() {
  return Math.round(state.symbolColumns) * Math.round(state.symbolRows) * getBitsPerSymbol();
}

function getEstimatedBitrateBitsPerSecond() {
  return getDataPerFrameBits() * fps;
}

function formatBits(bits) {
  if (bits >= 1_000_000_000) {
    return `${(bits / 1_000_000_000).toFixed(2)} Gb`;
  }
  if (bits >= 1_000_000) {
    return `${(bits / 1_000_000).toFixed(2)} Mb`;
  }
  if (bits >= 1_000) {
    return `${(bits / 1_000).toFixed(2)} Kb`;
  }
  return `${Math.round(bits)} b`;
}

function formatBitrate(bitsPerSecond) {
  if (bitsPerSecond >= 1_000_000_000) {
    return `${(bitsPerSecond / 1_000_000_000).toFixed(2)} Gbps`;
  }
  if (bitsPerSecond >= 1_000_000) {
    return `${(bitsPerSecond / 1_000_000).toFixed(2)} Mbps`;
  }
  if (bitsPerSecond >= 1_000) {
    return `${(bitsPerSecond / 1_000).toFixed(2)} Kbps`;
  }
  return `${Math.round(bitsPerSecond)} bps`;
}

function getHudData() {
  const tilePixels = getResolvedTilePixels();
  const dataPerFrameBits = getDataPerFrameBits();
  const estimatedBitrate = getEstimatedBitrateBitsPerSecond();
  return {
    frame,
    fps,
    targetFps: Math.round(state.targetFps),
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    symbolColumns: Math.round(state.symbolColumns),
    symbolRows: Math.round(state.symbolRows),
    tilePixels,
    colorBits: getResolvedColorBits(),
    colorCount: getResolvedColorCount(),
    shapeBits: getResolvedShapeBits(),
    shapeCount: getResolvedShapeCount(),
    bitsPerSymbol: getBitsPerSymbol(),
    dataPerFrameText: formatBits(dataPerFrameBits),
    estimatedBitrateText: formatBitrate(estimatedBitrate),
    motion: Math.round(state.motion),
    paused: state.paused,
  };
}

function updateHudText() {
  const text = translate("hud")(getHudData());
  hud.textContent = text;
  statusEl.textContent = text;
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
    frame: gl.getUniformLocation(program, "uFrame"),
    symbolGrid: gl.getUniformLocation(program, "uSymbolGrid"),
    colorBits: gl.getUniformLocation(program, "uColorBits"),
    shapeBits: gl.getUniformLocation(program, "uShapeBits"),
    tilePixels: gl.getUniformLocation(program, "uTilePixels"),
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
  const tilePixels = getResolvedTilePixels();
  const width = Math.max(1, Math.round(state.symbolColumns) * SYMBOL_TILE_DIM * tilePixels);
  const height = Math.max(1, Math.round(state.symbolRows) * SYMBOL_TILE_DIM * tilePixels);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
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
  if (!state.paused) {
    frame += 1;
  }
  const dt = now - lastFrameTime;
  lastFrameTime = now;
  const instant = dt > 0 ? 1000 / dt : 0;
  fps = fps === 0 ? instant : fps * 0.92 + instant * 0.08;
  const tilePixels = getResolvedTilePixels();

  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.frame, frame);
  gl.uniform2i(uniforms.symbolGrid, Math.round(state.symbolColumns), Math.round(state.symbolRows));
  gl.uniform1i(uniforms.colorBits, getResolvedColorBits());
  gl.uniform1i(uniforms.shapeBits, getResolvedShapeBits());
  gl.uniform1i(uniforms.tilePixels, tilePixels);
  gl.uniform1f(uniforms.motion, state.motion);
  gl.uniform1f(uniforms.paletteShift, state.paletteShift);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  if (state.showHud && frame % 10 === 0) {
    updateHudText();
    hud.style.display = "block";
    statusEl.dataset.mode = "dynamic";
    statusEl.dataset.statusKey = "";
    statusEl.dataset.statusKind = "";
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
  if (key === " " || event.code === "Space") {
    event.preventDefault();
    togglePaused();
  }
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

function togglePaused() {
  state.paused = !state.paused;
  document.getElementById("paused").checked = state.paused;
  updateHudText();
}

document.getElementById("symbolGridLinked").checked = state.symbolGridLinked;
document.getElementById("symbolGridLinked").addEventListener("change", (event) => {
  state.symbolGridLinked = event.target.checked;
  if (state.symbolGridLinked) {
    syncControl("symbolRows", state.symbolColumns);
    resizeCanvas();
  }
});
document.getElementById("showHud").checked = state.showHud;
document.getElementById("showHud").addEventListener("change", (event) => {
  state.showHud = event.target.checked;
  hud.style.display = state.showHud ? "block" : "none";
});
document.getElementById("vSyncPace").checked = state.vSyncPace;
document.getElementById("vSyncPace").addEventListener("change", (event) => {
  state.vSyncPace = event.target.checked;
});
document.getElementById("paused").checked = state.paused;
document.getElementById("paused").addEventListener("change", (event) => {
  state.paused = event.target.checked;
  updateHudText();
});

try {
  for (const button of langButtons) {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.lang || "zh");
      updateFullscreenState();
    });
  }
  initControl("targetFps");
  initControl("symbolColumns");
  initControl("symbolRows");
  initControl("shapeBits");
  initControl("colorBits");
  initControl("tilePixels");
  initControl("motion");
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
