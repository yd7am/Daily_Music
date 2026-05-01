import type { SceneDefinition } from "../core/scene-types";
import { barsNeoScene } from "./barsNeo";
import { circlePulseScene } from "./circlePulse";
import { debugScene } from "./debugScene";
import { particleBurstScene } from "./particleBurst";

export const scenes: SceneDefinition[] = [
  barsNeoScene,
  circlePulseScene,
  particleBurstScene,
  debugScene,
];

export function getSceneById(id: string): SceneDefinition {
  return scenes.find((scene) => scene.id === id) ?? scenes[0];
}
