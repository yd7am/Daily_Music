import "./styles.css";

import { loadAnalysisFromFile } from "./core/analysis-store";
import {
  applyRenderControls,
  getRenderControls,
  renderControlKeys,
  setRenderControl,
  type RenderControlKey,
  type RenderControls,
} from "./core/render-controls";
import { RendererEngine } from "./core/renderer-engine";
import { getPresetById, visualPresets } from "./presets/music-presets";
import { getSceneById, scenes } from "./scenes";
import { GsapConductor } from "./timeline/gsap-conductor";
import type { AnalysisData } from "./types/analysis";

const RENDER_CONFIG_STORAGE_KEY = "dailyMusic.renderConfig.v1";
const RENDER_CONFIG_VERSION = 1;
const RENDER_CONFIG_FILE_NAME = "render-controls.json";

interface RendererConfigPayload {
  presetId?: string;
  sceneId?: string;
  controls: Partial<Record<RenderControlKey, number>>;
}

interface PersistedRendererConfig extends RendererConfigPayload {
  version: number;
  updatedAt: string;
}

interface SliderBinding {
  range: HTMLInputElement;
  valueLabel: HTMLSpanElement;
  key: RenderControlKey;
  formatter: (value: number) => string;
}

interface OfflineBridge {
  loadAnalysisObject: (data: AnalysisData, sceneId?: string) => void;
  seek: (timeSec: number) => void;
  setScene: (sceneId: string) => void;
  setRenderControls: (values: Partial<Record<RenderControlKey, number>>) => void;
  applyRendererConfig: (config: unknown) => void;
  getRendererConfig: () => PersistedRendererConfig;
  getDuration: () => number;
}

declare global {
  interface Window {
    dailyMusicOffline?: OfflineBridge;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasPreset(presetId: string): boolean {
  return visualPresets.some((preset) => preset.id === presetId);
}

function hasScene(sceneId: string): boolean {
  return scenes.some((scene) => scene.id === sceneId);
}

function parseRendererConfigPayload(raw: unknown): RendererConfigPayload | null {
  if (!isRecord(raw)) {
    return null;
  }

  const controlsSource = isRecord(raw.controls) ? raw.controls : raw;
  const controls: Partial<Record<RenderControlKey, number>> = {};
  for (const key of renderControlKeys) {
    const value = controlsSource[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      controls[key] = value;
    }
  }

  const presetId =
    typeof raw.presetId === "string"
      ? raw.presetId
      : typeof raw.preset === "string"
        ? raw.preset
        : undefined;
  const sceneId =
    typeof raw.sceneId === "string"
      ? raw.sceneId
      : typeof raw.scene === "string"
        ? raw.scene
        : undefined;
  if (!presetId && !sceneId && Object.keys(controls).length === 0) {
    return null;
  }

  return {
    presetId,
    sceneId,
    controls,
  };
}

function readRendererConfigFromStorage(): RendererConfigPayload | null {
  try {
    const raw = localStorage.getItem(RENDER_CONFIG_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return parseRendererConfigPayload(parsed);
  } catch {
    return null;
  }
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("找不到挂载节点 #app");
}

app.innerHTML = `
  <main class="layout">
    <section class="panel">
      <h1>Daily Music Web Renderer</h1>
      <p class="hint">导入 analysis.json 和音频文件，实时预览特效并支持离线导出。</p>
      <div class="row">
        <label>Analysis 文件</label>
        <input id="analysisInput" type="file" accept=".json,application/json" />
      </div>
      <div class="row">
        <label>音频文件</label>
        <input id="audioInput" type="file" accept=".mp3,.wav,.flac,.m4a,.ogg,.aac,audio/*" />
      </div>
      <div class="row">
        <label>场景</label>
        <select id="sceneSelect"></select>
      </div>
      <div class="row">
        <label>预设</label>
        <select id="presetSelect"></select>
      </div>
      <div class="row">
        <label>粒子速度 <span id="particleSpeedValue" class="inline-value"></span></label>
        <input id="particleSpeedRange" type="range" min="0.3" max="2" step="0.05" />
      </div>
      <div class="row">
        <label>圆形震动强度 <span id="circleVibrationValue" class="inline-value"></span></label>
        <input id="circleVibrationRange" type="range" min="0.2" max="1.8" step="0.05" />
      </div>
      <div class="row">
        <label>频谱高度增益 <span id="circleSpectrumGainValue" class="inline-value"></span></label>
        <input id="circleSpectrumGainRange" type="range" min="0.2" max="2.8" step="0.05" />
      </div>
      <div class="row">
        <label>频谱线宽 <span id="circleLineWidthValue" class="inline-value"></span></label>
        <input id="circleLineWidthRange" type="range" min="0.6" max="4.5" step="0.05" />
      </div>
      <div class="row">
        <label>频谱光效 <span id="circleGlowStrengthValue" class="inline-value"></span></label>
        <input id="circleGlowStrengthRange" type="range" min="0.2" max="2.5" step="0.05" />
      </div>
      <div class="row">
        <label>频谱间距 <span id="circleSpacingValue" class="inline-value"></span></label>
        <input id="circleSpacingRange" type="range" min="0.6" max="2.4" step="0.05" />
      </div>
      <div class="row">
        <label>频谱数量 <span id="circleLineCountValue" class="inline-value"></span></label>
        <input id="circleLineCountRange" type="range" min="16" max="220" step="1" />
      </div>
      <div class="row">
        <label>进度</label>
        <input id="seekRange" type="range" min="0" max="0" step="0.001" value="0" />
      </div>
      <div class="toolbar">
        <button id="playPauseBtn">播放</button>
        <button id="restartBtn">重播</button>
      </div>
      <div class="toolbar">
        <button id="saveConfigBtn">导出参数</button>
        <button id="importConfigBtn">导入参数</button>
        <input id="importConfigInput" type="file" accept=".json,application/json" hidden />
      </div>
      <p id="statusText" class="status">等待加载 analysis.json...</p>
    </section>
    <section class="stage">
      <canvas id="renderCanvas" width="1280" height="720"></canvas>
      <audio id="audioPlayer" crossorigin="anonymous"></audio>
    </section>
  </main>
`;

const analysisInput = document.querySelector<HTMLInputElement>("#analysisInput")!;
const audioInput = document.querySelector<HTMLInputElement>("#audioInput")!;
const sceneSelect = document.querySelector<HTMLSelectElement>("#sceneSelect")!;
const presetSelect = document.querySelector<HTMLSelectElement>("#presetSelect")!;
const particleSpeedRange = document.querySelector<HTMLInputElement>("#particleSpeedRange")!;
const particleSpeedValue = document.querySelector<HTMLSpanElement>("#particleSpeedValue")!;
const circleVibrationRange = document.querySelector<HTMLInputElement>("#circleVibrationRange")!;
const circleVibrationValue = document.querySelector<HTMLSpanElement>("#circleVibrationValue")!;
const circleSpectrumGainRange = document.querySelector<HTMLInputElement>("#circleSpectrumGainRange")!;
const circleSpectrumGainValue = document.querySelector<HTMLSpanElement>("#circleSpectrumGainValue")!;
const circleLineWidthRange = document.querySelector<HTMLInputElement>("#circleLineWidthRange")!;
const circleLineWidthValue = document.querySelector<HTMLSpanElement>("#circleLineWidthValue")!;
const circleGlowStrengthRange = document.querySelector<HTMLInputElement>("#circleGlowStrengthRange")!;
const circleGlowStrengthValue = document.querySelector<HTMLSpanElement>("#circleGlowStrengthValue")!;
const circleSpacingRange = document.querySelector<HTMLInputElement>("#circleSpacingRange")!;
const circleSpacingValue = document.querySelector<HTMLSpanElement>("#circleSpacingValue")!;
const circleLineCountRange = document.querySelector<HTMLInputElement>("#circleLineCountRange")!;
const circleLineCountValue = document.querySelector<HTMLSpanElement>("#circleLineCountValue")!;
const seekRange = document.querySelector<HTMLInputElement>("#seekRange")!;
const playPauseBtn = document.querySelector<HTMLButtonElement>("#playPauseBtn")!;
const restartBtn = document.querySelector<HTMLButtonElement>("#restartBtn")!;
const saveConfigBtn = document.querySelector<HTMLButtonElement>("#saveConfigBtn")!;
const importConfigBtn = document.querySelector<HTMLButtonElement>("#importConfigBtn")!;
const importConfigInput = document.querySelector<HTMLInputElement>("#importConfigInput")!;
const statusText = document.querySelector<HTMLParagraphElement>("#statusText")!;
const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas")!;
const audio = document.querySelector<HTMLAudioElement>("#audioPlayer")!;

const defaultRenderControls: RenderControls = { ...getRenderControls() };

for (const scene of scenes) {
  const option = document.createElement("option");
  option.value = scene.id;
  option.textContent = scene.label;
  sceneSelect.appendChild(option);
}

for (const preset of visualPresets) {
  const option = document.createElement("option");
  option.value = preset.id;
  option.textContent = preset.label;
  presetSelect.appendChild(option);
}
const storedRendererConfig = readRendererConfigFromStorage();
const initialPresetId = storedRendererConfig?.presetId && hasPreset(storedRendererConfig.presetId)
  ? storedRendererConfig.presetId
  : "pop";
presetSelect.value = initialPresetId;
const initialSceneId = storedRendererConfig?.sceneId && hasScene(storedRendererConfig.sceneId)
  ? storedRendererConfig.sceneId
  : getPresetById(initialPresetId).defaultSceneId;
sceneSelect.value = initialSceneId;
if (storedRendererConfig?.controls) {
  applyRenderControls(storedRendererConfig.controls);
}

const renderer = new RendererEngine(canvas);
const conductor = new GsapConductor();
conductor.setPreset(presetSelect.value);
renderer.bindAudio(audio);
renderer.start();

let analysisData: AnalysisData | null = null;
let isPlaying = false;
const sliderBindings: SliderBinding[] = [];

function bindControlSlider(
  range: HTMLInputElement,
  valueLabel: HTMLSpanElement,
  key: RenderControlKey,
  formatter: (value: number) => string
): void {
  const binding: SliderBinding = { range, valueLabel, key, formatter };
  sliderBindings.push(binding);
  syncSliderBinding(binding);

  range.addEventListener("input", () => {
    const value = Number.parseFloat(range.value);
    setRenderControl(key, value);
    syncSliderBinding(binding);
    saveRendererConfigToStorage();
  });
}

function setStatus(text: string): void {
  statusText.textContent = text;
}

function collectControlValues(): Partial<Record<RenderControlKey, number>> {
  const controls = getRenderControls();
  const snapshot: Partial<Record<RenderControlKey, number>> = {};
  for (const key of renderControlKeys) {
    snapshot[key] = controls[key];
  }
  return snapshot;
}

function buildPersistedRendererConfig(): PersistedRendererConfig {
  return {
    version: RENDER_CONFIG_VERSION,
    presetId: presetSelect.value,
    sceneId: sceneSelect.value,
    controls: collectControlValues(),
    updatedAt: new Date().toISOString(),
  };
}

function saveRendererConfigToStorage(): void {
  try {
    localStorage.setItem(RENDER_CONFIG_STORAGE_KEY, JSON.stringify(buildPersistedRendererConfig()));
  } catch {
    // Ignore storage quota / privacy errors.
  }
}

function syncSliderBinding(binding: SliderBinding): void {
  const controls = getRenderControls();
  const currentValue = controls[binding.key];
  binding.range.value = String(currentValue);
  binding.valueLabel.textContent = binding.formatter(currentValue);
}

function syncAllSliderBindings(): void {
  for (const binding of sliderBindings) {
    syncSliderBinding(binding);
  }
}

function applyRendererConfigPayload(payload: RendererConfigPayload, persist = true): void {
  const nextPresetId =
    payload.presetId && hasPreset(payload.presetId) ? payload.presetId : presetSelect.value;
  const presetChanged = nextPresetId !== presetSelect.value;
  if (presetChanged) {
    presetSelect.value = nextPresetId;
    conductor.setPreset(nextPresetId);
    if (analysisData) {
      conductor.build(analysisData);
    }
  }

  if (Object.keys(payload.controls).length > 0) {
    applyRenderControls(payload.controls);
    syncAllSliderBindings();
  }

  let nextSceneId = sceneSelect.value;
  if (payload.sceneId && hasScene(payload.sceneId)) {
    nextSceneId = payload.sceneId;
  } else if (presetChanged) {
    nextSceneId = getPresetById(nextPresetId).defaultSceneId;
  }
  if (nextSceneId !== sceneSelect.value) {
    sceneSelect.value = nextSceneId;
  }
  if (analysisData) {
    renderer.setScene(getSceneById(sceneSelect.value));
  }

  if (persist) {
    saveRendererConfigToStorage();
  }
}

async function hydrateRendererConfigFromFileIfNeeded(): Promise<void> {
  if (storedRendererConfig) {
    return;
  }
  try {
    const response = await fetch(`./${RENDER_CONFIG_FILE_NAME}`, { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = parseRendererConfigPayload((await response.json()) as unknown);
    if (!payload) {
      return;
    }
    applyRendererConfigPayload(payload, true);
    setStatus(`已从 ${RENDER_CONFIG_FILE_NAME} 读取渲染参数。`);
  } catch {
    // Ignore missing local config file.
  }
}

function syncSeekMax(data: AnalysisData): void {
  seekRange.max = data.meta.duration.toFixed(3);
  seekRange.value = "0";
}

function mountAnalysis(data: AnalysisData): void {
  analysisData = data;
  syncSeekMax(data);
  conductor.setPreset(presetSelect.value);
  conductor.build(data);

  const scene = getSceneById(sceneSelect.value || scenes[0].id);
  renderer.load(
    data,
    scene,
    () => conductor.getState(),
    (timeSec, frame) => {
      conductor.seek(timeSec);
      conductor.update(frame);
      if (!seekRange.matches(":active")) {
        seekRange.value = timeSec.toFixed(3);
      }
    }
  );

  setStatus(`analysis 已加载: ${data.frames.length} 帧, duration=${data.meta.duration.toFixed(2)}s`);
}

analysisInput.addEventListener("change", async (event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const data = await loadAnalysisFromFile(file);
    mountAnalysis(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`analysis 加载失败: ${message}`);
  }
});

audioInput.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }
  audio.src = URL.createObjectURL(file);
  setStatus(`音频已加载: ${file.name}`);
});

sceneSelect.addEventListener("change", () => {
  if (analysisData) {
    renderer.setScene(getSceneById(sceneSelect.value));
  }
  saveRendererConfigToStorage();
});

presetSelect.addEventListener("change", () => {
  conductor.setPreset(presetSelect.value);
  const preset = getPresetById(presetSelect.value);
  sceneSelect.value = preset.defaultSceneId;
  if (analysisData) {
    conductor.build(analysisData);
    renderer.setScene(getSceneById(preset.defaultSceneId));
  }
  saveRendererConfigToStorage();
});

playPauseBtn.addEventListener("click", () => {
  if (!analysisData) {
    setStatus("请先加载 analysis.json");
    return;
  }

  isPlaying = !isPlaying;
  if (isPlaying) {
    renderer.play();
    playPauseBtn.textContent = "暂停";
  } else {
    renderer.pause();
    playPauseBtn.textContent = "播放";
  }
});

restartBtn.addEventListener("click", () => {
  renderer.seek(0);
  if (!isPlaying) {
    renderer.play();
    isPlaying = true;
    playPauseBtn.textContent = "暂停";
  }
});

seekRange.addEventListener("input", () => {
  const timeSec = Number.parseFloat(seekRange.value);
  renderer.seek(Number.isFinite(timeSec) ? timeSec : 0);
});

saveConfigBtn.addEventListener("click", () => {
  const payload = buildPersistedRendererConfig();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = RENDER_CONFIG_FILE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus(`已导出参数文件: ${RENDER_CONFIG_FILE_NAME}`);
});

importConfigBtn.addEventListener("click", () => {
  importConfigInput.click();
});

importConfigInput.addEventListener("change", async (event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = "";
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const parsed = parseRendererConfigPayload(JSON.parse(text) as unknown);
    if (!parsed) {
      setStatus("导入失败: 文件中没有可用的渲染参数。");
      return;
    }
    applyRendererConfigPayload(parsed, true);
    setStatus(`已导入参数: ${file.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`导入失败: ${message}`);
  }
});

const query = new URLSearchParams(window.location.search);
const isOfflineMode = query.get("offline") === "1";
if (isOfflineMode) {
  document.body.classList.add("offline-mode");
  const width = Number.parseInt(query.get("width") ?? "1280", 10);
  const height = Number.parseInt(query.get("height") ?? "720", 10);
  if (Number.isFinite(width) && width > 0) {
    canvas.width = width;
  }
  if (Number.isFinite(height) && height > 0) {
    canvas.height = height;
  }
}

window.dailyMusicOffline = {
  loadAnalysisObject: (data: AnalysisData, sceneId?: string) => {
    mountAnalysis(data);
    if (sceneId) {
      sceneSelect.value = sceneId;
      renderer.setScene(getSceneById(sceneId));
    }
  },
  seek: (timeSec: number) => {
    renderer.seek(timeSec);
  },
  setScene: (sceneId: string) => {
    sceneSelect.value = sceneId;
    if (analysisData) {
      renderer.setScene(getSceneById(sceneId));
    }
    saveRendererConfigToStorage();
  },
  setRenderControls: (values: Partial<Record<RenderControlKey, number>>) => {
    applyRendererConfigPayload({ controls: values }, true);
  },
  applyRendererConfig: (config: unknown) => {
    const parsed = parseRendererConfigPayload(config);
    if (!parsed) {
      return;
    }
    applyRendererConfigPayload(parsed, true);
  },
  getRendererConfig: () => {
    return buildPersistedRendererConfig();
  },
  getDuration: () => analysisData?.meta.duration ?? 0,
};

bindControlSlider(particleSpeedRange, particleSpeedValue, "particleSpeed", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleVibrationRange, circleVibrationValue, "circleVibration", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleSpectrumGainRange, circleSpectrumGainValue, "circleSpectrumGain", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleLineWidthRange, circleLineWidthValue, "circleLineWidth", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleGlowStrengthRange, circleGlowStrengthValue, "circleGlowStrength", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleSpacingRange, circleSpacingValue, "circleSpacing", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleLineCountRange, circleLineCountValue, "circleLineCount", (value) => `${Math.round(value)}`);

if (!storedRendererConfig) {
  applyRenderControls(defaultRenderControls);
}
syncAllSliderBindings();
saveRendererConfigToStorage();
void hydrateRendererConfigFromFileIfNeeded();
