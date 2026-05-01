import "./styles.css";

import { loadAnalysisFromFile } from "./core/analysis-store";
import { RendererEngine } from "./core/renderer-engine";
import { getPresetById, visualPresets } from "./presets/music-presets";
import { getSceneById, scenes } from "./scenes";
import { GsapConductor } from "./timeline/gsap-conductor";
import type { AnalysisData } from "./types/analysis";

interface OfflineBridge {
  loadAnalysisObject: (data: AnalysisData, sceneId?: string) => void;
  seek: (timeSec: number) => void;
  setScene: (sceneId: string) => void;
  getDuration: () => number;
}

declare global {
  interface Window {
    dailyMusicOffline?: OfflineBridge;
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
        <label>进度</label>
        <input id="seekRange" type="range" min="0" max="0" step="0.001" value="0" />
      </div>
      <div class="toolbar">
        <button id="playPauseBtn">播放</button>
        <button id="restartBtn">重播</button>
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
const seekRange = document.querySelector<HTMLInputElement>("#seekRange")!;
const playPauseBtn = document.querySelector<HTMLButtonElement>("#playPauseBtn")!;
const restartBtn = document.querySelector<HTMLButtonElement>("#restartBtn")!;
const statusText = document.querySelector<HTMLParagraphElement>("#statusText")!;
const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas")!;
const audio = document.querySelector<HTMLAudioElement>("#audioPlayer")!;

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
presetSelect.value = "pop";

const renderer = new RendererEngine(canvas);
const conductor = new GsapConductor();
conductor.setPreset(presetSelect.value);
renderer.bindAudio(audio);
renderer.start();

let analysisData: AnalysisData | null = null;
let isPlaying = false;

function setStatus(text: string): void {
  statusText.textContent = text;
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
  if (!analysisData) {
    return;
  }
  renderer.setScene(getSceneById(sceneSelect.value));
});

presetSelect.addEventListener("change", () => {
  conductor.setPreset(presetSelect.value);
  if (!analysisData) {
    return;
  }
  const preset = getPresetById(presetSelect.value);
  conductor.build(analysisData);
  sceneSelect.value = preset.defaultSceneId;
  renderer.setScene(getSceneById(preset.defaultSceneId));
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
    renderer.setScene(getSceneById(sceneId));
  },
  getDuration: () => analysisData?.meta.duration ?? 0,
};
