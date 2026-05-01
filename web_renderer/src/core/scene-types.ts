import type { AnalysisData, AnalysisFrame } from "../types/analysis";

export interface RenderContext {
  width: number;
  height: number;
  progress: number;
  deltaTime: number;
  now: number;
}

export interface SceneAnimationState {
  glow: number;
  cameraShake: number;
  hueShift: number;
  pulse: number;
  particleBurst: number;
}

export interface SceneDefinition {
  id: string;
  label: string;
  initialize: (data: AnalysisData) => void;
  render: (
    ctx: CanvasRenderingContext2D,
    frame: AnalysisFrame,
    renderContext: RenderContext,
    state: SceneAnimationState
  ) => void;
  cleanup?: () => void;
}
