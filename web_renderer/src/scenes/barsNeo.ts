import type { SceneDefinition } from "../core/scene-types";
import type { AnalysisData } from "../types/analysis";

let barCount = 0;

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hueShift: number
): void {
  const hueA = 220 + hueShift * 80;
  const hueB = 300 + hueShift * 60;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsla(${hueA}, 65%, 8%, 1)`);
  gradient.addColorStop(1, `hsla(${hueB}, 75%, 5%, 1)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export const barsNeoScene: SceneDefinition = {
  id: "barsNeo",
  label: "Bars Neo",
  initialize: (data: AnalysisData) => {
    barCount = data.meta.bands;
  },
  render: (ctx, frame, rc, state) => {
    const { width, height } = rc;
    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height, state.hueShift);

    const shake = state.cameraShake * 10;
    const offsetX = (Math.random() - 0.5) * shake;
    const offsetY = (Math.random() - 0.5) * shake;
    const baseY = height * 0.9 + offsetY;
    const maxBarHeight = height * 0.72;

    const spectrum = frame.spectrum;
    const count = Math.max(1, barCount || spectrum.length);
    const spacing = Math.max(1, Math.floor(width / (count * 5)));
    const barWidth = Math.max(1, (width - spacing * (count - 1)) / count);
    const pulseScale = 1 + state.pulse * 0.25;

    for (let i = 0; i < spectrum.length; i += 1) {
      const amp = spectrum[i] ?? 0;
      const value = Math.pow(amp, 0.9) * pulseScale;
      const h = Math.min(maxBarHeight, value * maxBarHeight);
      const x = i * (barWidth + spacing) + offsetX;
      const y = baseY - h;
      const hue = ((i / spectrum.length) * 180 + state.hueShift * 120) % 360;

      const grad = ctx.createLinearGradient(x, y, x, baseY);
      grad.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.95)`);
      grad.addColorStop(1, `hsla(${hue + 36}, 100%, 45%, 0.45)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, h);

      if (h > 12) {
        ctx.fillStyle = `hsla(${hue + 20}, 100%, 92%, ${0.2 + state.glow * 0.6})`;
        ctx.fillRect(x, y - 2, barWidth, 3);
      }
    }

    const floorGlow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.86,
      8,
      width * 0.5,
      height * 0.86,
      width * 0.42
    );
    floorGlow.addColorStop(0, `hsla(${300 + state.hueShift * 60}, 100%, 75%, ${0.24 + state.glow * 0.25})`);
    floorGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);
  },
};
