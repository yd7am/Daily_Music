import type { SceneDefinition } from "../core/scene-types";
import type { AnalysisData } from "../types/analysis";

let barCount = 0;

export const circlePulseScene: SceneDefinition = {
  id: "circlePulse",
  label: "Circle Pulse",
  initialize: (data: AnalysisData) => {
    barCount = data.meta.bands;
  },
  render: (ctx, frame, rc, state) => {
    const { width, height } = rc;
    const cx = width * 0.5;
    const cy = height * 0.5;

    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.7);
    bg.addColorStop(0, `hsla(${220 + state.hueShift * 80}, 70%, 14%, 1)`);
    bg.addColorStop(1, `hsla(${250 + state.hueShift * 60}, 80%, 4%, 1)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const baseRadius = Math.min(width, height) * 0.22;
    const pulseRadius = baseRadius + frame.energy * 130 + state.pulse * 42;

    const spectrum = frame.spectrum;
    const count = Math.max(1, Math.min(spectrum.length, barCount || spectrum.length));
    const step = (Math.PI * 2) / count;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rc.now * 0.08);

    for (let i = 0; i < count; i += 1) {
      const amp = spectrum[i] ?? 0;
      const angle = i * step;
      const lineLength = 18 + amp * 170 + state.glow * 20;
      const inner = pulseRadius;
      const outer = pulseRadius + lineLength;
      const hue = (i * (360 / count) + state.hueShift * 140) % 360;

      const x1 = Math.cos(angle) * inner;
      const y1 = Math.sin(angle) * inner;
      const x2 = Math.cos(angle) * outer;
      const y2 = Math.sin(angle) * outer;

      ctx.strokeStyle = `hsla(${hue}, 100%, ${58 + amp * 25}%, ${0.35 + amp * 0.65})`;
      ctx.lineWidth = 1 + amp * 3.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();

    const ringGlow = ctx.createRadialGradient(cx, cy, pulseRadius * 0.85, cx, cy, pulseRadius * 1.45);
    ringGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
    ringGlow.addColorStop(1, `hsla(${290 + state.hueShift * 70}, 100%, 62%, ${0.15 + state.glow * 0.25})`);
    ctx.strokeStyle = ringGlow;
    ctx.lineWidth = 10 + frame.rms * 18;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `hsla(${180 + state.hueShift * 120}, 100%, 70%, ${0.2 + frame.onset * 0.6})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 8 + frame.onset * 18 + state.pulse * 8, 0, Math.PI * 2);
    ctx.fill();
  },
};
