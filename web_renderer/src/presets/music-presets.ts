import presets from "./visual-presets.json";

export interface VisualPreset {
  id: string;
  label: string;
  defaultSceneId: string;
  glowScale: number;
  beatThreshold: number;
  onsetThreshold: number;
  hueDrift: number;
  particleGain: number;
}

export const visualPresets: VisualPreset[] = presets as VisualPreset[];

export function getPresetById(id: string): VisualPreset {
  return visualPresets.find((preset) => preset.id === id) ?? visualPresets[1];
}
