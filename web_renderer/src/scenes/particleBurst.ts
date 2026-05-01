import type { SceneDefinition } from "../core/scene-types";
import { getRenderControls } from "../core/render-controls";
import type { AnalysisData } from "../types/analysis";

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

const particles: Particle[] = [];
let lastEmitT = -1;
let barCount = 0;

function spawnBurst(
  cx: number,
  cy: number,
  amount: number,
  intensity: number,
  hueShift: number,
  speedScale: number
): void {
  const emitCount = Math.max(4, Math.floor(amount));
  for (let i = 0; i < emitCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (120 + Math.random() * 200 * (0.3 + intensity)) * speedScale;
    const startX = cx;
    const startY = cy;
    particles.push({
      x: startX,
      y: startY,
      prevX: startX,
      prevY: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 2.0 + Math.random() * 1.8,
      maxLife: 2.0 + Math.random() * 1.8,
      size: 1.4 + Math.random() * 3.4,
      hue: (Math.random() * 100 + 190 + hueShift * 120) % 360,
    });
  }
}

export const particleBurstScene: SceneDefinition = {
  id: "particleBurst",
  label: "Particle Burst",
  initialize: (data: AnalysisData) => {
    particles.length = 0;
    lastEmitT = -1;
    barCount = data.meta.bands;
  },
  render: (ctx, frame, rc, state) => {
    const { width, height, deltaTime } = rc;
    const controls = getRenderControls();
    const cx = width * 0.5;
    const cy = height * 0.52;
    const vibration = controls.circleVibration;
    const spectrumGain = controls.circleSpectrumGain;
    const lineWidthScale = controls.circleLineWidth;
    const glowStrength = controls.circleGlowStrength;
    const ringRadius = Math.min(width, height) * 0.24 + frame.energy * (96 * vibration);
    const spectrum = frame.spectrum;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(5, 7, 16, 0.2)";
    ctx.fillRect(0, 0, width, height);

    const triggerValue = Math.max(
      frame.onset * 1.25,
      frame.beat * 1.1,
      frame.energy * 0.8,
      state.particleBurst
    );
    if (triggerValue > 0.14 && frame.t - lastEmitT > 0.045) {
      lastEmitT = frame.t;
      spawnBurst(cx, cy, 8 + triggerValue * 42, triggerValue, state.hueShift, controls.particleSpeed);
    }

    const fadeZone = 18;
    const outLimit = Math.max(width, height) * 0.92;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      const dt = deltaTime || 1 / 60;
      p.life -= dt;
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.989;
      p.vy *= 0.989;

      const dist = Math.hypot(p.x - cx, p.y - cy);

      if (
        p.life <= 0 ||
        dist > outLimit ||
        p.x < -90 ||
        p.x > width + 90 ||
        p.y < -90 ||
        p.y > height + 90
      ) {
        particles.splice(i, 1);
        continue;
      }

      let distanceAlpha = 1;
      if (dist < ringRadius - fadeZone) {
        continue;
      } else if (dist < ringRadius + fadeZone) {
        distanceAlpha = (dist - (ringRadius - fadeZone)) / (2 * fadeZone);
      }

      const alpha = p.life / p.maxLife;
      const finalAlpha = Math.max(0.03, alpha * distanceAlpha);

      ctx.strokeStyle = `hsla(${p.hue}, 100%, ${68 + frame.energy * 22}%, ${finalAlpha * 0.4})`;
      ctx.lineWidth = Math.max(0.8, p.size * 0.35);
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.fillStyle = `hsla(${p.hue}, 100%, ${70 + frame.energy * 20}%, ${finalAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    const ringGlow = ctx.createRadialGradient(cx, cy, ringRadius * 0.7, cx, cy, ringRadius * 1.3);
    ringGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
    ringGlow.addColorStop(1, `hsla(${250 + state.hueShift * 100}, 90%, 64%, ${0.25 + frame.energy * 0.3})`);
    ctx.strokeStyle = ringGlow;
    ctx.lineWidth = 8 + frame.rms * 14;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    const sourceCount = Math.max(1, Math.min(barCount || spectrum.length, spectrum.length));
    const lineCount = Math.max(
      12,
      Math.min(sourceCount, Math.round(controls.circleLineCount / controls.circleSpacing))
    );
    const angleStep = (Math.PI * 2) / lineCount;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rc.now * 0.08);
    ctx.lineCap = "round";

    const auraRing = ctx.createRadialGradient(0, 0, ringRadius * 0.78, 0, 0, ringRadius * 1.5);
    auraRing.addColorStop(0, `hsla(${220 + state.hueShift * 60}, 100%, 50%, 0)`);
    auraRing.addColorStop(1, `hsla(${294 + state.hueShift * 85}, 100%, 62%, ${(0.1 + state.glow * 0.18) * glowStrength})`);
    ctx.strokeStyle = auraRing;
    ctx.lineWidth = (5 + state.glow * 8) * glowStrength;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius + 2, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < lineCount; i += 1) {
      const spectrumIdx = Math.floor((i / lineCount) * spectrum.length);
      const amp = spectrum[spectrumIdx] ?? 0;
      const angle = i * angleStep;
      const inner = ringRadius - 2 + Math.sin(rc.now * 2.2 + i * 0.28) * (0.8 + state.pulse * 1.8);
      const waveOffset =
        Math.sin(rc.now * 4.4 + i * 0.31 + frame.energy * 2.6) *
        (1.4 + amp * 8.8) *
        (0.32 + state.glow * 0.68);
      const outer =
        inner +
        Math.max(6, 8 + amp * (56 * spectrumGain) + state.glow * (10 * spectrumGain) + waveOffset);
      const hue = (i * (360 / lineCount) + state.hueShift * 130) % 360;
      const x1 = Math.cos(angle) * inner;
      const y1 = Math.sin(angle) * inner;
      const x2 = Math.cos(angle) * outer;
      const y2 = Math.sin(angle) * outer;

      const beamGradient = ctx.createLinearGradient(x1, y1, x2, y2);
      beamGradient.addColorStop(0, `hsla(${hue - 16}, 100%, ${44 + amp * 12}%, ${0.22 + amp * 0.32})`);
      beamGradient.addColorStop(0.6, `hsla(${hue + 8}, 100%, ${57 + amp * 18}%, ${0.44 + amp * 0.4})`);
      beamGradient.addColorStop(1, `hsla(${hue + 36}, 100%, ${71 + amp * 16}%, ${0.58 + amp * 0.4})`);
      ctx.strokeStyle = beamGradient;
      ctx.shadowColor = `hsla(${hue + 34}, 100%, 62%, ${0.26 + amp * 0.46})`;
      ctx.shadowBlur = (6 + amp * 18 + state.glow * 10) * glowStrength;
      ctx.lineWidth = (1 + amp * 1.95) * lineWidthScale;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (amp > 0.2) {
        ctx.fillStyle = `hsla(${hue + 54}, 100%, ${66 + amp * 15}%, ${0.22 + amp * 0.48})`;
        ctx.shadowColor = `hsla(${hue + 54}, 100%, 68%, ${0.28 + amp * 0.44})`;
        ctx.shadowBlur = (7 + amp * 10 + state.glow * 8) * glowStrength;
        ctx.beginPath();
        ctx.arc(x2, y2, (0.42 + amp * 1.5) * lineWidthScale, 0, Math.PI * 2);
        ctx.fill();

        if (amp > 0.5 && Math.random() < 0.2 + frame.beat * 0.4) {
          const sparkAngle = angle + (Math.random() - 0.5) * 0.14;
          const sparkRadius = outer + 2 + Math.random() * 8;
          ctx.fillStyle = `hsla(${hue + 70}, 100%, 80%, ${0.2 + amp * 0.28})`;
          ctx.beginPath();
          ctx.arc(
            Math.cos(sparkAngle) * sparkRadius,
            Math.sin(sparkAngle) * sparkRadius,
            (0.35 + amp * 1.1) * lineWidthScale,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.restore();
  },
  cleanup: () => {
    particles.length = 0;
  },
};
