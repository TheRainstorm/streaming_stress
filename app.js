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
  showLatencyHud: true,
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
    showLatencyHudLabel: "联合延迟测试",
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
      `状态：${paused ? "暂停" : "运行"} | 图案步数 ${frame}\n帧率：${fps.toFixed(1)} / ${targetFps} FPS | 图案数据量估算：${estimatedBitrateText}\n数据：${dataPerFrameText}/帧 | ${bitsPerSymbol} bit/symbol\n网格：${symbolColumns} x ${symbolRows} symbols | 画布：${canvasWidth} x ${canvasHeight}px\n编码：颜色 ${colorCount} (k=${colorBits}) | 形状 ${shapeCount} (n=${shapeBits})\n渲染：tile ${tilePixels}px | 运动 ${motion}`,
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
    showLatencyHudLabel: "Latency + load",
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
      `Status: ${paused ? "paused" : "running"} | pattern step ${frame}\nFPS: ${fps.toFixed(1)} / ${targetFps} | Pattern data estimate: ${estimatedBitrateText}\nData: ${dataPerFrameText}/frame | ${bitsPerSymbol} bit/symbol\nGrid: ${symbolColumns} x ${symbolRows} symbols | Canvas: ${canvasWidth} x ${canvasHeight}px\nEncoding: colors ${colorCount} (k=${colorBits}) | shapes ${shapeCount} (n=${shapeBits})\nRender: tile ${tilePixels}px | motion ${motion}`,
  },
};

Object.assign(LOCALES.zh, {
  symbolColumnsLabel: "符号网格大小",
  symbolColumnsDesc: "默认 64 × 64。增大网格以提高负载；可在高级选项中单独设置行数。",
  symbolRowsDesc: "默认与列数相同。取消联动后可单独调节行数。",
  gridLinkHelp: "取消联动后，可独立调整符号行数。",
  targetFpsDesc: "默认 200；实际渲染帧率受屏幕刷新率和浏览器限制。",
  fullscreenButtonEnter: "全屏测试",
  fullscreenButtonExit: "退出全屏",
  controlEyebrow: "测试参数",
  measurementTools: "照片读数",
  readingMode: "读数方式",
  positionMode: "矩阵位置 · 0–299",
  frameMode: "完整帧号",
  sourceReadingLabel: "主机屏",
  clientReadingLabel: "串流屏",
  sampleFpsLabel: "拍摄时源画面 FPS",
  exportFrameLog: "导出帧时间 CSV",
  resetLatency: "重新计数",
  workspaceEyebrow: "STREAMING / LAB",
  workspaceTitle: "让延迟，看得见。",
  workspaceSubtitle: "左侧读时间，右侧施加编码负载。",
  liveSession: "联合测试",
  latencyTitle: "延迟矩阵",
  latencySubtitle: "30 × 10 · 每个渲染帧前进一格",
  frameLabel: "连续帧号",
  timeLabel: "本地时间",
  positionLabel: "格位",
  cycleLabel: "圈数",
  sessionLabel: "会话",
  measuredFpsLabel: "实测渲染 FPS",
  frameIntervalLabel: "平均帧间隔",
  matrixWindowLabel: "一圈时长",
  matrixLegend: "蛇形读取 · 白格为当前帧",
  photoTip: "两屏同框拍摄。亮格重叠时，记录范围。",
  loadTitle: "编码负载",
  loadSubtitle: "动态符号图案",
  loadEstimateLabel: "图案数据量估算",
  loadGridLabel: "符号网格",
  loadDisclaimer: "图案用于调节编码压力；实际串流 Mbps 请在串流客户端查看。",
  captureTitle: "拍摄建议",
  captureGuide: "两屏并排、矩阵同高；使用短曝光，关闭 HDR / 夜景，多次采样。",
  measurementScope: "测量串流屏相对主机屏的显示延迟。",
  cadenceWarming: "正在采样渲染节奏…",
  cadenceStable: "渲染节奏稳定",
  cadenceUneven: "帧间隔波动 · 建议用完整帧号读数",
  loadPaused: "图案暂停",
  loadRunning: "持续变化",
  framesUnit: "帧",
  positionAssumption: "假设主机领先且相差不足一圈。请输入拍摄时源画面实测 FPS（不是目标 FPS 或手机帧率）；帧率波动时改用完整帧号。",
  frameAssumption: "输入同一会话的完整帧号，优先查询最近 20,000 帧时间记录。完整帧号 = 圈数 × 300 + 格位。",
  loggedResult: "使用当前会话记录的两帧时间差；这是源渲染时间间隔，照片仍受曝光、屏幕扫描和读数误差影响。",
  missingLogResult: "记录已过期或不在当前会话中，按输入 FPS 估算。请核对照片会话编号和拍摄时源画面 FPS。",
  invalidReadings: "请输入有效的非负整数。格位范围 0–299；完整帧号模式要求主机帧号不小于串流帧号。",
  invalidFps: "请输入拍摄时源画面的有效实测 FPS（大于 0）。",
  contextLost: "WebGL 上下文丢失，测试已暂停，等待恢复。",
});
Object.assign(LOCALES.en, {
  symbolColumnsLabel: "Symbol grid size",
  symbolColumnsDesc: "Default 64 × 64. Increase for more load; set independent rows in Advanced.",
  symbolRowsDesc: "Matches columns by default. Unlink to adjust rows independently.",
  gridLinkHelp: "Unlink rows and columns to adjust the row count separately.",
  targetFpsDesc: "Default 200; rendering is bounded by display refresh and the browser.",
  fullscreenButtonEnter: "Fullscreen test",
  fullscreenButtonExit: "Exit fullscreen",
  controlEyebrow: "Test controls",
  measurementTools: "Photo readings",
  readingMode: "Reading format",
  positionMode: "Matrix position · 0–299",
  frameMode: "Full frame number",
  sourceReadingLabel: "Host display",
  clientReadingLabel: "Stream display",
  sampleFpsLabel: "Source FPS at capture",
  exportFrameLog: "Export frame times CSV",
  resetLatency: "New session",
  workspaceEyebrow: "STREAMING / LAB",
  workspaceTitle: "Make latency visible.",
  workspaceSubtitle: "Read time on the left. Apply encoding load on the right.",
  liveSession: "Combined test",
  latencyTitle: "Latency matrix",
  latencySubtitle: "30 × 10 · One cell per rendered frame",
  frameLabel: "Continuous frame",
  timeLabel: "Local time",
  positionLabel: "Position",
  cycleLabel: "Cycle",
  sessionLabel: "Session",
  measuredFpsLabel: "Render FPS",
  frameIntervalLabel: "Mean interval",
  matrixWindowLabel: "Cycle duration",
  matrixLegend: "Snake order · White marks the current frame",
  photoTip: "Photograph both displays together. Record a range if cells overlap.",
  loadTitle: "Encoding load",
  loadSubtitle: "Dynamic symbol pattern",
  loadEstimateLabel: "Pattern data estimate",
  loadGridLabel: "Symbol grid",
  loadDisclaimer: "The pattern varies encoding load. Read actual stream Mbps in your streaming client.",
  captureTitle: "Capture tips",
  captureGuide: "Align both matrices at the same height. Use short exposure, disable HDR / night mode, and repeat.",
  measurementScope: "Measures stream display delay relative to the host display.",
  cadenceWarming: "Sampling render cadence…",
  cadenceStable: "Steady render cadence",
  cadenceUneven: "Uneven frame times · Use full frame readings",
  loadPaused: "Pattern paused",
  loadRunning: "Changing",
  framesUnit: "frames",
  positionAssumption: "Assumes the host leads by less than one cycle. Enter measured source FPS at capture, not target or camera FPS. Use full frame numbers for uneven cadence.",
  frameAssumption: "Use full frame numbers from this session to look up the last 20,000 frame times. Full frame = cycle × 300 + position.",
  loggedResult: "Uses this session's recorded source frame interval. Exposure, display scanning and photo reading still affect the measurement.",
  missingLogResult: "Frame times are outside this session's retained history; estimated using entered FPS. Check the photo session ID and measured source FPS at capture.",
  invalidReadings: "Enter nonnegative integers. Positions must be 0–299; full host frame must be at least the stream frame.",
  invalidFps: "Enter valid measured source FPS at capture (greater than 0).",
  contextLost: "WebGL context lost. Test paused until recovery.",
});

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
const latencyHud = document.getElementById("latencyHud");
const latencyTime = document.getElementById("latencyTime");
const latencyFrame = document.getElementById("latencyFrame");
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
const MATRIX_COLUMNS = 30;
const MATRIX_ROWS = 10;
const MATRIX_SIZE = MATRIX_COLUMNS * MATRIX_ROWS;
const FRAME_LOG_CAPACITY = 20_000;
const frameTimes = new Float64Array(FRAME_LOG_CAPACITY);
const frameIds = new Float64Array(FRAME_LOG_CAPACITY).fill(-1);
const matrixCells = [];
const recentIntervals = [];
let renderFrame = -1;
let activePosition = -1;
let lastMetricsTime = -Infinity;
let sessionId = "";
let cadenceStable = false;
const timeOrigin = Number.isFinite(performance.timeOrigin)
  ? performance.timeOrigin
  : Date.now() - performance.now();

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
  updateMeasurementMetrics();
  updateLatencyCalculation();
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
    if (id === "targetFps") nextAllowedFrame = 0;
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
  return state.paused ? 0 : getDataPerFrameBits() * fps;
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

function formatLatencyTime(absoluteTimeMs) {
  const wholeMs = Math.floor(absoluteTimeMs);
  const date = new Date(wholeMs);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function updateLatencyHud(now) {
  const position = renderFrame % MATRIX_SIZE;
  if (position !== activePosition) {
    if (activePosition >= 0) matrixCells[activePosition].classList.remove("active");
    matrixCells[position].classList.add("active");
    activePosition = position;
  }
  latencyTime.textContent = formatLatencyTime(timeOrigin + now);
  latencyFrame.textContent = String(renderFrame).padStart(6, "0");
  document.getElementById("latencyPosition").textContent = String(position).padStart(3, "0");
  document.getElementById("latencyCycle").textContent = String(Math.floor(renderFrame / MATRIX_SIZE)).padStart(3, "0");
}

function buildLatencyMatrix() {
  const matrix = document.getElementById("latencyMatrix");
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < MATRIX_ROWS; row += 1) {
    const rowEl = document.createElement("div");
    rowEl.className = "matrix-row";
    const cells = document.createElement("div");
    cells.className = "matrix-cells";
    const reverse = row % 2 === 1;
    const first = row * MATRIX_COLUMNS;
    const left = document.createElement("span");
    left.className = "matrix-row-label";
    left.textContent = `${String(first + (reverse ? 29 : 0)).padStart(3, "0")} ${reverse ? "←" : "→"}`;
    rowEl.append(left, cells);
    for (let column = 0; column < MATRIX_COLUMNS; column += 1) {
      const position = first + (reverse ? MATRIX_COLUMNS - 1 - column : column);
      const cell = document.createElement("span");
      cell.className = `matrix-cell${column % 5 === 0 ? " major" : ""}`;
      cell.dataset.position = String(position);
      cell.textContent = String(position).padStart(3, "0");
      matrixCells[position] = cell;
      cells.append(cell);
    }
    const right = document.createElement("span");
    right.className = "matrix-row-label";
    right.textContent = String(first + (reverse ? 0 : 29)).padStart(3, "0");
    rowEl.append(right);
    fragment.append(rowEl);
  }
  matrix.append(fragment);
}

function resetLatencySession() {
  renderFrame = -1;
  frameIds.fill(-1);
  recentIntervals.length = 0;
  fps = 0;
  lastFrameTime = 0;
  lastMetricsTime = -Infinity;
  nextAllowedFrame = 0;
  if (activePosition >= 0) matrixCells[activePosition].classList.remove("active");
  activePosition = -1;
  sessionId = `${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  document.getElementById("latencySession").textContent = sessionId;
  for (const id of ["latencyFrame", "latencyTime", "latencyPosition", "latencyCycle"]) {
    document.getElementById(id).textContent = "—";
  }
  for (const id of ["sourceReading", "clientReading"]) document.getElementById(id).value = "";
  updateLatencyCalculation();
}

function getFrameTimestamp(id) {
  const slot = id % FRAME_LOG_CAPACITY;
  return frameIds[slot] === id ? frameTimes[slot] : null;
}

function updateLatencyCalculation() {
  const sourceInput = document.getElementById("sourceReading");
  const clientInput = document.getElementById("clientReading");
  const positionMode = document.getElementById("latencyReadMode").value === "position";
  const output = document.getElementById("latencyResult");
  const note = document.getElementById("latencyResultNote");
  for (const input of [sourceInput, clientInput]) {
    if (positionMode) input.max = String(MATRIX_SIZE - 1);
    else input.removeAttribute("max");
  }
  output.textContent = "—";
  note.textContent = translate(positionMode ? "positionAssumption" : "frameAssumption");
  if (sourceInput.value === "" || clientInput.value === "") return;
  const source = Number(sourceInput.value);
  const client = Number(clientInput.value);
  if (![source, client].every((value) => Number.isSafeInteger(value) && value >= 0)
    || (positionMode && (source >= MATRIX_SIZE || client >= MATRIX_SIZE))
    || (!positionMode && source < client)) {
    note.textContent = translate("invalidReadings");
    return;
  }
  const delta = positionMode ? (source - client + MATRIX_SIZE) % MATRIX_SIZE : source - client;
  if (!positionMode) {
    const sourceTime = getFrameTimestamp(source);
    const clientTime = getFrameTimestamp(client);
    if (sourceTime !== null && clientTime !== null) {
      output.textContent = `${(sourceTime - clientTime).toFixed(2)} ms · ${delta} ${translate("framesUnit")}`;
      note.textContent = translate("loggedResult");
      return;
    }
  }
  const sampleFps = Number(document.getElementById("sampleFps").value);
  if (!Number.isFinite(sampleFps) || sampleFps <= 0) {
    note.textContent = translate("invalidFps");
    return;
  }
  output.textContent = `≈ ${(delta * 1000 / sampleFps).toFixed(2)} ms · ${delta} ${translate("framesUnit")}`;
  note.textContent = translate(positionMode ? "positionAssumption" : "missingLogResult");
}

function exportFrameLog() {
  const rows = ["session,frame,position,cycle,raf_time_ms,absolute_time_ms"];
  for (let id = Math.max(0, renderFrame - FRAME_LOG_CAPACITY + 1); id <= renderFrame; id += 1) {
    const time = getFrameTimestamp(id);
    if (time !== null) rows.push(`${sessionId},${id},${id % MATRIX_SIZE},${Math.floor(id / MATRIX_SIZE)},${time.toFixed(3)},${(timeOrigin + time).toFixed(3)}`);
  }
  const url = URL.createObjectURL(new Blob([rows.join("\n") + "\n"], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `streaming-frames-${sessionId}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateMeasurementMetrics() {
  const mean = recentIntervals.length ? recentIntervals.reduce((sum, dt) => sum + dt, 0) / recentIntervals.length : 0;
  fps = mean > 0 ? 1000 / mean : 0;
  cadenceStable = recentIntervals.length >= 30 && recentIntervals.every((dt) => Math.abs(dt - mean) < mean * 0.25);
  document.getElementById("latencyFps").textContent = fps > 0 ? fps.toFixed(1) : "—";
  document.getElementById("latencyInterval").textContent = mean > 0 ? `${mean.toFixed(2)} ms` : "—";
  document.getElementById("latencyWindow").textContent = mean > 0 ? `${(MATRIX_SIZE * mean / 1000).toFixed(2)} s` : "—";
  const cadence = document.getElementById("cadenceStatus");
  cadence.textContent = translate(recentIntervals.length < 30 ? "cadenceWarming" : cadenceStable ? "cadenceStable" : "cadenceUneven");
  cadence.dataset.state = recentIntervals.length < 30 ? "warming" : cadenceStable ? "stable" : "uneven";
  document.getElementById("loadEstimate").textContent = formatBitrate(getEstimatedBitrateBitsPerSecond());
  document.getElementById("loadGrid").textContent = `${Math.round(state.symbolColumns)} × ${Math.round(state.symbolRows)}`;
  document.getElementById("loadState").textContent = translate(state.paused ? "loadPaused" : "loadRunning");
  // Full frame inputs may now be available in the retained history.
  if (document.getElementById("latencyReadMode").value === "frame") updateLatencyCalculation();
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
  const surface = canvas.parentElement;
  const scale = Math.min(1, Math.max(1, surface.clientWidth) / width, Math.max(1, surface.clientHeight) / height);
  canvas.style.width = `${Math.max(1, width * scale)}px`;
  canvas.style.height = `${Math.max(1, height * scale)}px`;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }
}

function render(now) {
  requestAnimationFrame(render);
  if (!gl || gl.isContextLost()) return;
  // Keep the target timeline instead of accumulating each callback's jitter.
  if (state.vSyncPace && now + 0.25 < nextAllowedFrame) {
    return;
  }
  const targetInterval = 1000 / Math.max(1, state.targetFps);
  if (nextAllowedFrame === 0) nextAllowedFrame = now;
  nextAllowedFrame += targetInterval;
  if (nextAllowedFrame <= now) nextAllowedFrame = now + targetInterval;

  if (!state.paused) {
    frame += 1;
  }
  const dt = lastFrameTime > 0 ? now - lastFrameTime : 0;
  lastFrameTime = now;
  if (dt > 0) {
    recentIntervals.push(dt);
    if (recentIntervals.length > 120) recentIntervals.shift();
  }
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

  renderFrame += 1;
  const slot = renderFrame % FRAME_LOG_CAPACITY;
  frameIds[slot] = renderFrame;
  frameTimes[slot] = now;
  if (state.showLatencyHud) {
    updateLatencyHud(now);
  }

  if (now - lastMetricsTime >= 250) {
    lastMetricsTime = now;
    updateMeasurementMetrics();
    updateHudText();
    hud.style.display = state.showHud ? "block" : "none";
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
new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  setStaticStatus("statusGenericError", "error", translate("contextLost"));
});
canvas.addEventListener("webglcontextrestored", () => {
  try {
    setupWebGL();
    resizeCanvas();
    nextAllowedFrame = 0;
    setStaticStatus("statusReady");
  } catch (error) {
    setStaticStatus("statusGenericError", "error", String(error));
  }
});

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
document.getElementById("showLatencyHud").checked = state.showLatencyHud;
document.getElementById("showLatencyHud").addEventListener("change", (event) => {
  state.showLatencyHud = event.target.checked;
  stage.classList.toggle("latency-mode", state.showLatencyHud);
  latencyHud.setAttribute("aria-hidden", String(!state.showLatencyHud));
  resizeCanvas();
});
document.getElementById("vSyncPace").checked = state.vSyncPace;
document.getElementById("vSyncPace").addEventListener("change", (event) => {
  state.vSyncPace = event.target.checked;
  nextAllowedFrame = 0;
});
document.getElementById("paused").checked = state.paused;
document.getElementById("paused").addEventListener("change", (event) => {
  state.paused = event.target.checked;
  updateHudText();
});

try {
  buildLatencyMatrix();
  resetLatencySession();
  stage.classList.toggle("latency-mode", state.showLatencyHud);
  latencyHud.setAttribute("aria-hidden", String(!state.showLatencyHud));
  for (const id of ["sourceReading", "clientReading", "sampleFps", "latencyReadMode"]) {
    document.getElementById(id).addEventListener("input", updateLatencyCalculation);
  }
  document.getElementById("exportFrameLog").addEventListener("click", exportFrameLog);
  document.getElementById("resetLatency").addEventListener("click", resetLatencySession);
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
