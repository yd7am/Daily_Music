export type RenderControlKey =
  | "particleSpeed"
  | "circleVibration"
  | "circleSpectrumGain"
  | "circleLineWidth"
  | "circleGlowStrength"
  | "circleSpacing"
  | "circleLineCount";

export const renderControlKeys: RenderControlKey[] = [
  "particleSpeed",
  "circleVibration",
  "circleSpectrumGain",
  "circleLineWidth",
  "circleGlowStrength",
  "circleSpacing",
  "circleLineCount",
];

export interface RenderControls {
  particleSpeed: number;
  circleVibration: number;
  circleSpectrumGain: number;
  circleLineWidth: number;
  circleGlowStrength: number;
  circleSpacing: number;
  circleLineCount: number;
}

const controls: RenderControls = {
  particleSpeed: 0.85,
  circleVibration: 0.7,
  circleSpectrumGain: 0.7,
  circleLineWidth: 1.6,
  circleGlowStrength: 1.15,
  circleSpacing: 1.15,
  circleLineCount: 84,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getRenderControls(): RenderControls {
  return controls;
}

export function setRenderControl(key: RenderControlKey, value: number): void {
  if (!Number.isFinite(value)) {
    return;
  }

  switch (key) {
    case "particleSpeed":
      controls.particleSpeed = clamp(value, 0.3, 2);
      break;
    case "circleVibration":
      controls.circleVibration = clamp(value, 0.2, 1.8);
      break;
    case "circleSpectrumGain":
      controls.circleSpectrumGain = clamp(value, 0.2, 2.8);
      break;
    case "circleLineWidth":
      controls.circleLineWidth = clamp(value, 0.6, 4.5);
      break;
    case "circleGlowStrength":
      controls.circleGlowStrength = clamp(value, 0.2, 2.5);
      break;
    case "circleSpacing":
      controls.circleSpacing = clamp(value, 0.6, 2.4);
      break;
    case "circleLineCount":
      controls.circleLineCount = clamp(Math.round(value), 16, 220);
      break;
    default:
      break;
  }
}

export function applyRenderControls(values: Partial<Record<RenderControlKey, number>>): void {
  for (const key of renderControlKeys) {
    const value = values[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    setRenderControl(key, value);
  }
}
