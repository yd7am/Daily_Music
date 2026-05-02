import type { AnalysisData, AnalysisFrame } from "../types/analysis";
import { TimeSyncController } from "./time-sync";
import type { SceneAnimationState, SceneDefinition } from "./scene-types";

export class RendererEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private analysis: AnalysisData | null = null;
  private timeSync: TimeSyncController | null = null;
  private scene: SceneDefinition | null = null;
  private animationStateProvider: (() => SceneAnimationState) | null = null;
  private audio: HTMLAudioElement | null = null;
  private frameListener: ((timeSec: number, frame: AnalysisFrame) => void) | null = null;

  private rafId: number | null = null;
  private lastNow = 0;
  private fallbackTimeSec = 0;
  private fallbackAnchorNow = 0;
  private fallbackPlaying = false;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("当前环境不支持 2D Canvas。");
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  bindAudio(audio: HTMLAudioElement): void {
    this.audio = audio;
  }

  load(
    analysis: AnalysisData,
    scene: SceneDefinition,
    animationStateProvider: () => SceneAnimationState,
    frameListener?: (timeSec: number, frame: AnalysisFrame) => void
  ): void {
    this.analysis = analysis;
    this.timeSync = new TimeSyncController(analysis);
    this.scene = scene;
    this.animationStateProvider = animationStateProvider;
    this.frameListener = frameListener ?? null;
    this.scene.initialize(analysis);
  }

  setScene(scene: SceneDefinition): void {
    if (!this.analysis) {
      return;
    }
    this.scene?.cleanup?.();
    this.scene = scene;
    this.scene.initialize(this.analysis);
  }

  private getCurrentTime(): number {
    if (this.audio && Number.isFinite(this.audio.currentTime)) {
      return this.audio.currentTime;
    }

    if (!this.fallbackPlaying) {
      return this.fallbackTimeSec;
    }

    const elapsed = Math.max(0, performance.now() / 1000 - this.fallbackAnchorNow);
    return this.fallbackTimeSec + elapsed;
  }

  play(): void {
    if (this.audio && this.audio.src) {
      void this.audio.play();
      return;
    }
    if (!this.fallbackPlaying) {
      this.fallbackPlaying = true;
      this.fallbackAnchorNow = performance.now() / 1000;
    }
  }

  pause(): void {
    if (this.audio && this.audio.src) {
      this.audio.pause();
      return;
    }
    if (this.fallbackPlaying) {
      this.fallbackTimeSec = this.getCurrentTime();
      this.fallbackPlaying = false;
    }
  }

  seek(timeSec: number): void {
    const nextTime = Math.max(0, timeSec);
    if (this.audio && this.audio.src) {
      try {
        this.audio.currentTime = nextTime;
      } catch (_error) {
        // Metadata not ready, fallback to manual timer to keep UI responsive.
        this.fallbackTimeSec = nextTime;
      }
      return;
    }
    this.fallbackTimeSec = nextTime;
    this.fallbackAnchorNow = performance.now() / 1000;
  }

  private drawFrame(now: number): void {
    if (!this.analysis || !this.timeSync || !this.scene || !this.animationStateProvider) {
      return;
    }

    const currentTime = this.getCurrentTime();
    if (!this.audio && this.analysis && currentTime > this.analysis.meta.duration) {
      this.pause();
      this.seek(0);
    }
    const frame = this.timeSync.getFrameByTime(currentTime);
    this.frameListener?.(currentTime, frame);
    const progress = this.timeSync.getProgress(currentTime);
    const deltaTime = this.lastNow === 0 ? 0 : (now - this.lastNow) / 1000;
    this.lastNow = now;

    const state = this.animationStateProvider();
    this.scene.render(
      this.ctx,
      frame,
      {
        width: this.canvas.width,
        height: this.canvas.height,
        progress,
        deltaTime,
        now: now / 1000,
      },
      state
    );
  }

  private loop = (now: number): void => {
    this.drawFrame(now);
    this.rafId = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.rafId !== null) {
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.scene?.cleanup?.();
  }
}
