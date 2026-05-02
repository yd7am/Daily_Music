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
import { getSubtitleStyle, setSubtitleStyle, SUBTITLE_FONT_OPTIONS } from "./core/subtitle-overlay";
import { getTrackOverlayInfo, setTrackOverlayInfo, TRACK_FONT_OPTIONS } from "./core/track-overlay";
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
  trackTitle?: string;
  trackArtist?: string;
  trackFont?: string;
  subtitleFont?: string;
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
  seekAndRender: (timeSec: number) => void;
  startRealtimePlayback: (startTimeSec?: number) => void;
  stopRealtimePlayback: () => void;
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
  const trackTitle =
    typeof raw.trackTitle === "string"
      ? raw.trackTitle
      : typeof raw.title === "string"
        ? raw.title
        : undefined;
  const trackArtist =
    typeof raw.trackArtist === "string"
      ? raw.trackArtist
      : typeof raw.artist === "string"
        ? raw.artist
        : undefined;
  const trackFont =
    typeof raw.trackFont === "string"
      ? raw.trackFont
      : typeof raw.fontKey === "string"
        ? raw.fontKey
        : typeof raw.font === "string"
          ? raw.font
          : undefined;
  const subtitleFont =
    typeof raw.subtitleFont === "string"
      ? raw.subtitleFont
      : typeof raw.subtitleFontKey === "string"
        ? raw.subtitleFontKey
        : undefined;
  if (
    !presetId &&
    !sceneId &&
    trackTitle === undefined &&
    trackArtist === undefined &&
    trackFont === undefined &&
    subtitleFont === undefined &&
    Object.keys(controls).length === 0
  ) {
    return null;
  }

  return {
    presetId,
    sceneId,
    trackTitle,
    trackArtist,
    trackFont,
    subtitleFont,
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
const query = new URLSearchParams(window.location.search);
const isOfflineMode = query.get("offline") === "1";

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
        <label>曲名</label>
        <input id="trackTitleInput" type="text" placeholder="Cry For Me (feat. Ami)" />
      </div>
      <div class="row">
        <label>作者</label>
        <input id="trackArtistInput" type="text" placeholder="Michita" />
      </div>
      <div class="row">
        <label>标题字体</label>
        <select id="trackFontSelect"></select>
      </div>
      <div class="row">
        <label>字幕字体</label>
        <select id="subtitleFontSelect"></select>
      </div>
      <div class="row">
        <label>字幕字号 <span id="subtitleSizeValue" class="inline-value"></span></label>
        <input id="subtitleSizeRange" type="range" min="0.55" max="2.4" step="0.05" />
      </div>
      <div class="row">
        <label>粒子风格</label>
        <select id="particleStyleModeSelect">
          <option value="0">圆形光点</option>
          <option value="1">立体多面体</option>
          <option value="2">混合（推荐）</option>
        </select>
      </div>
      <div class="row">
        <label>随机种子</label>
        <input id="particleSeedInput" type="number" min="1" max="9999999" step="1" />
      </div>
      <div class="row">
        <label>粒子速度 <span id="particleSpeedValue" class="inline-value"></span></label>
        <input id="particleSpeedRange" type="range" min="0.3" max="2" step="0.05" />
      </div>
      <div class="row">
        <label>多面体密度 <span id="particleShardDensityValue" class="inline-value"></span></label>
        <input id="particleShardDensityRange" type="range" min="0.4" max="2.4" step="0.05" />
      </div>
      <div class="row">
        <label>3D旋转强度 <span id="particle3DRotationValue" class="inline-value"></span></label>
        <input id="particle3DRotationRange" type="range" min="0.2" max="3" step="0.05" />
      </div>
      <div class="row">
        <label>圆形震动强度 <span id="circleVibrationValue" class="inline-value"></span></label>
        <input id="circleVibrationRange" type="range" min="0.2" max="1.8" step="0.05" />
      </div>
      <div class="row">
        <label>中心图片缩放 <span id="circleCoverScaleValue" class="inline-value"></span></label>
        <input id="circleCoverScaleRange" type="range" min="0.35" max="1.15" step="0.01" />
      </div>
      <div class="row">
        <label>进度条距离圆环 <span id="circleHudGapValue" class="inline-value"></span></label>
        <input id="circleHudGapRange" type="range" min="28" max="260" step="2" />
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
const trackTitleInput = document.querySelector<HTMLInputElement>("#trackTitleInput")!;
const trackArtistInput = document.querySelector<HTMLInputElement>("#trackArtistInput")!;
const trackFontSelect = document.querySelector<HTMLSelectElement>("#trackFontSelect")!;
const subtitleFontSelect = document.querySelector<HTMLSelectElement>("#subtitleFontSelect")!;
const subtitleSizeRange = document.querySelector<HTMLInputElement>("#subtitleSizeRange")!;
const subtitleSizeValue = document.querySelector<HTMLSpanElement>("#subtitleSizeValue")!;
const particleStyleModeSelect = document.querySelector<HTMLSelectElement>("#particleStyleModeSelect")!;
const particleSeedInput = document.querySelector<HTMLInputElement>("#particleSeedInput")!;
const particleSpeedRange = document.querySelector<HTMLInputElement>("#particleSpeedRange")!;
const particleSpeedValue = document.querySelector<HTMLSpanElement>("#particleSpeedValue")!;
const particleShardDensityRange = document.querySelector<HTMLInputElement>("#particleShardDensityRange")!;
const particleShardDensityValue = document.querySelector<HTMLSpanElement>("#particleShardDensityValue")!;
const particle3DRotationRange = document.querySelector<HTMLInputElement>("#particle3DRotationRange")!;
const particle3DRotationValue = document.querySelector<HTMLSpanElement>("#particle3DRotationValue")!;
const circleVibrationRange = document.querySelector<HTMLInputElement>("#circleVibrationRange")!;
const circleVibrationValue = document.querySelector<HTMLSpanElement>("#circleVibrationValue")!;
const circleCoverScaleRange = document.querySelector<HTMLInputElement>("#circleCoverScaleRange")!;
const circleCoverScaleValue = document.querySelector<HTMLSpanElement>("#circleCoverScaleValue")!;
const circleHudGapRange = document.querySelector<HTMLInputElement>("#circleHudGapRange")!;
const circleHudGapValue = document.querySelector<HTMLSpanElement>("#circleHudGapValue")!;
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
for (const fontOption of TRACK_FONT_OPTIONS) {
  const option = document.createElement("option");
  option.value = fontOption.key;
  option.textContent = fontOption.label;
  trackFontSelect.appendChild(option);
}
for (const fontOption of SUBTITLE_FONT_OPTIONS) {
  const option = document.createElement("option");
  option.value = fontOption.key;
  option.textContent = fontOption.label;
  subtitleFontSelect.appendChild(option);
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
if (
  storedRendererConfig?.trackTitle !== undefined ||
  storedRendererConfig?.trackArtist !== undefined ||
  storedRendererConfig?.trackFont !== undefined
) {
  const initialTrackPayload: { title?: string; artist?: string; fontKey?: string } = {};
  if (typeof storedRendererConfig.trackTitle === "string") {
    initialTrackPayload.title = storedRendererConfig.trackTitle;
  }
  if (typeof storedRendererConfig.trackArtist === "string") {
    initialTrackPayload.artist = storedRendererConfig.trackArtist;
  }
  if (typeof storedRendererConfig.trackFont === "string") {
    initialTrackPayload.fontKey = storedRendererConfig.trackFont;
  }
  setTrackOverlayInfo(initialTrackPayload);
}
if (storedRendererConfig?.subtitleFont !== undefined) {
  setSubtitleStyle({ fontKey: storedRendererConfig.subtitleFont });
}

const renderer = new RendererEngine(canvas);
const conductor = new GsapConductor();
conductor.setPreset(presetSelect.value);
renderer.bindAudio(audio);
if (!isOfflineMode) {
  renderer.start();
}

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
  const trackInfo = getTrackOverlayInfo();
  const subtitleStyle = getSubtitleStyle();
  return {
    version: RENDER_CONFIG_VERSION,
    presetId: presetSelect.value,
    sceneId: sceneSelect.value,
    trackTitle: trackInfo.title,
    trackArtist: trackInfo.artist,
    trackFont: trackInfo.fontKey,
    subtitleFont: subtitleStyle.fontKey,
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

function syncDiscreteControlBindings(): void {
  const controls = getRenderControls();
  particleStyleModeSelect.value = String(Math.round(controls.particleStyleMode));
  particleSeedInput.value = String(Math.round(controls.particleSeed));
}

function syncTrackInfoInputs(): void {
  const trackInfo = getTrackOverlayInfo();
  const subtitleStyle = getSubtitleStyle();
  trackTitleInput.value = trackInfo.title;
  trackArtistInput.value = trackInfo.artist;
  trackFontSelect.value = trackInfo.fontKey;
  subtitleFontSelect.value = subtitleStyle.fontKey;
}

function syncAllControlBindings(): void {
  syncAllSliderBindings();
  syncDiscreteControlBindings();
  syncTrackInfoInputs();
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

  const hasTrackTitle = typeof payload.trackTitle === "string";
  const hasTrackArtist = typeof payload.trackArtist === "string";
  const hasTrackFont = typeof payload.trackFont === "string";
  const hasSubtitleFont = typeof payload.subtitleFont === "string";
  if (hasTrackTitle || hasTrackArtist || hasTrackFont) {
    const currentTrack = getTrackOverlayInfo();
    const nextTrack = {
      title: currentTrack.title,
      artist: currentTrack.artist,
      fontKey: currentTrack.fontKey,
    };
    if (typeof payload.trackTitle === "string") {
      nextTrack.title = payload.trackTitle;
    }
    if (typeof payload.trackArtist === "string") {
      nextTrack.artist = payload.trackArtist;
    }
    setTrackOverlayInfo({
      title: nextTrack.title,
      artist: nextTrack.artist,
      fontKey: typeof payload.trackFont === "string" ? payload.trackFont : nextTrack.fontKey,
    });
    syncTrackInfoInputs();
  }
  if (hasSubtitleFont) {
    setSubtitleStyle({ fontKey: payload.subtitleFont });
    syncTrackInfoInputs();
  }

  if (Object.keys(payload.controls).length > 0) {
    applyRenderControls(payload.controls);
    syncAllControlBindings();
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
  const currentTrack = getTrackOverlayInfo();
  if (!currentTrack.title) {
    const inferredTitle = file.name.replace(/\.[^/.]+$/, "");
    setTrackOverlayInfo({ title: inferredTitle });
    syncTrackInfoInputs();
    saveRendererConfigToStorage();
  }
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

trackTitleInput.addEventListener("input", () => {
  setTrackOverlayInfo({ title: trackTitleInput.value });
  saveRendererConfigToStorage();
});

trackArtistInput.addEventListener("input", () => {
  setTrackOverlayInfo({ artist: trackArtistInput.value });
  saveRendererConfigToStorage();
});

trackFontSelect.addEventListener("change", () => {
  setTrackOverlayInfo({ fontKey: trackFontSelect.value });
  syncTrackInfoInputs();
  saveRendererConfigToStorage();
});

subtitleFontSelect.addEventListener("change", () => {
  setSubtitleStyle({ fontKey: subtitleFontSelect.value });
  syncTrackInfoInputs();
  saveRendererConfigToStorage();
});

particleStyleModeSelect.addEventListener("change", () => {
  const styleMode = Number.parseInt(particleStyleModeSelect.value, 10);
  setRenderControl("particleStyleMode", Number.isFinite(styleMode) ? styleMode : 2);
  syncDiscreteControlBindings();
  saveRendererConfigToStorage();
});

particleSeedInput.addEventListener("change", () => {
  const seedValue = Number.parseInt(particleSeedInput.value, 10);
  setRenderControl("particleSeed", Number.isFinite(seedValue) ? seedValue : getRenderControls().particleSeed);
  syncDiscreteControlBindings();
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
  seekAndRender: (timeSec: number) => {
    renderer.seek(timeSec);
    renderer.renderNow();
  },
  startRealtimePlayback: (startTimeSec = 0) => {
    const nextTime = Number.isFinite(startTimeSec) ? Math.max(0, startTimeSec) : 0;
    renderer.start();
    renderer.seek(nextTime);
    renderer.play();
  },
  stopRealtimePlayback: () => {
    renderer.pause();
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
bindControlSlider(
  particleShardDensityRange,
  particleShardDensityValue,
  "particleShardDensity",
  (value) => `${value.toFixed(2)}x`
);
bindControlSlider(
  particle3DRotationRange,
  particle3DRotationValue,
  "particle3DRotation",
  (value) => `${value.toFixed(2)}x`
);
bindControlSlider(subtitleSizeRange, subtitleSizeValue, "subtitleSize", (value) => `${Math.round(value * 100)}%`);
bindControlSlider(circleVibrationRange, circleVibrationValue, "circleVibration", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleCoverScaleRange, circleCoverScaleValue, "circleCoverScale", (value) => `${Math.round(value * 100)}%`);
bindControlSlider(circleHudGapRange, circleHudGapValue, "circleHudGap", (value) => `${Math.round(value)}px`);
bindControlSlider(circleSpectrumGainRange, circleSpectrumGainValue, "circleSpectrumGain", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleLineWidthRange, circleLineWidthValue, "circleLineWidth", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleGlowStrengthRange, circleGlowStrengthValue, "circleGlowStrength", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleSpacingRange, circleSpacingValue, "circleSpacing", (value) => `${value.toFixed(2)}x`);
bindControlSlider(circleLineCountRange, circleLineCountValue, "circleLineCount", (value) => `${Math.round(value)}`);

if (!storedRendererConfig) {
  applyRenderControls(defaultRenderControls);
}
syncAllControlBindings();
saveRendererConfigToStorage();
void hydrateRendererConfigFromFileIfNeeded();
