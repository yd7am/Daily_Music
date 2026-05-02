import gsap from "gsap";
import type { SceneAnimationState } from "../core/scene-types";
import { getPresetById, type VisualPreset } from "../presets/music-presets";
import type { AnalysisData, AnalysisFrame } from "../types/analysis";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class GsapConductor {
  private state: SceneAnimationState = {
    glow: 0.2,
    cameraShake: 0,
    hueShift: 0,
    pulse: 0,
    particleBurst: 0,
  };

  private timeline = gsap.timeline({ paused: true });
  private lastBeatAt = -1;
  private lastOnsetAt = -1;
  private preset: VisualPreset = getPresetById("pop");

  setPreset(presetId: string): void {
    this.preset = getPresetById(presetId);
  }

  build(analysis: AnalysisData): void {
    this.timeline.kill();
    this.timeline = gsap.timeline({ paused: true });

    const duration = Math.max(0.1, analysis.meta.duration);
    this.timeline.to(this.state, {
      hueShift: this.preset.hueDrift,
      duration,
      ease: "none",
    });

    for (const segment of analysis.segments ?? []) {
      const segmentDuration = Math.max(0.2, segment.end - segment.start);
      const intensity = clamp01(segment.intensity ?? 0.5);
      const at = Math.max(0, segment.start);
      this.timeline.to(
        this.state,
        {
          glow: (0.2 + intensity * 0.8) * this.preset.glowScale,
          cameraShake: intensity * 0.5,
          duration: segmentDuration,
          ease: "sine.inOut",
        },
        at
      );
    }
  }

  update(frame: AnalysisFrame): void {
    if (frame.beat > this.preset.beatThreshold && frame.t - this.lastBeatAt > 0.12) {
      this.lastBeatAt = frame.t;
      gsap.fromTo(
        this.state,
        { pulse: 1, cameraShake: Math.max(this.state.cameraShake, 0.3) },
        { pulse: 0, cameraShake: this.state.cameraShake, duration: 0.25, ease: "power2.out" }
      );
    }

    if (frame.onset > this.preset.onsetThreshold && frame.t - this.lastOnsetAt > 0.08) {
      this.lastOnsetAt = frame.t;
      const burstStrength = clamp01(frame.onset * 1.2 * this.preset.particleGain);
      gsap.fromTo(
        this.state,
        { particleBurst: burstStrength },
        { particleBurst: 0, duration: 0.3, ease: "power3.out" }
      );
    }
  }

  seek(time: number): void {
    this.timeline.seek(Math.max(0, time), false);
  }

  getState(): SceneAnimationState {
    return this.state;
  }

  destroy(): void {
    this.timeline.kill();
    gsap.killTweensOf(this.state);
  }
}
