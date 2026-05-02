import type { SceneDefinition } from "../core/scene-types";
import type { AnalysisData } from "../types/analysis";

let barCount = 0;

export const debugScene: SceneDefinition = {
  id: "debug",
  label: "Debug Spectrum",
  initialize: (data: AnalysisData) => {
    barCount = data.meta.bands;
  },
  render: (ctx, frame, renderContext, state) => {
    const { width, height } = renderContext;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(2, 5, 22, 1)";
    ctx.fillRect(0, 0, width, height);

    const spectrum = frame.spectrum;
    const count = Math.max(1, barCount || spectrum.length);
    const spacing = 2;
    const barWidth = Math.max(1, (width - spacing * (count - 1)) / count);

    for (let i = 0; i < spectrum.length; i += 1) {
      const amp = spectrum[i] ?? 0;
      const x = i * (barWidth + spacing);
      const h = amp * height * 0.7;
      const y = height - h;
      const hue = (i / spectrum.length) * 220 + state.hueShift * 50;
      ctx.fillStyle = `hsla(${hue}, 90%, 60%, 0.9)`;
      ctx.fillRect(x, y, barWidth, h);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "14px monospace";
    ctx.fillText(`time=${frame.t.toFixed(2)}s`, 16, 24);
    ctx.fillText(`rms=${frame.rms.toFixed(3)} energy=${frame.energy.toFixed(3)}`, 16, 44);
  },
};
