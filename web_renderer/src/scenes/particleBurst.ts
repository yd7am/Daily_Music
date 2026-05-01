import type { SceneDefinition } from "../core/scene-types";
import type { AnalysisData } from "../types/analysis";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

const particles: Particle[] = [];
let lastEmitT = -1;

function spawnBurst(
  cx: number,
  cy: number,
  amount: number,
  intensity: number,
  hueShift: number
): void {
  const emitCount = Math.max(4, Math.floor(amount));
  for (let i = 0; i < emitCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 220 * (0.5 + intensity);
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.8,
      maxLife: 0.4 + Math.random() * 0.8,
      size: 1.2 + Math.random() * 3.8,
      hue: (Math.random() * 100 + 190 + hueShift * 120) % 360,
    });
  }
}

export const particleBurstScene: SceneDefinition = {
  id: "particleBurst",
  label: "Particle Burst",
  initialize: (_data: AnalysisData) => {
    particles.length = 0;
    lastEmitT = -1;
  },
  render: (ctx, frame, rc, state) => {
    const { width, height, deltaTime } = rc;
    const cx = width * 0.5;
    const cy = height * 0.52;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(5, 7, 16, 0.34)";
    ctx.fillRect(0, 0, width, height);

    const triggerValue = Math.max(frame.onset, state.particleBurst);
    if (triggerValue > 0.42 && frame.t - lastEmitT > 0.06) {
      lastEmitT = frame.t;
      spawnBurst(cx, cy, 18 + triggerValue * 90, triggerValue, state.hueShift);
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= deltaTime || 1 / 60;
      p.x += p.vx * (deltaTime || 1 / 60);
      p.y += p.vy * (deltaTime || 1 / 60);
      p.vx *= 0.987;
      p.vy *= 0.987;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `hsla(${p.hue}, 100%, ${64 + frame.energy * 20}%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    const radius = 20 + frame.energy * 80 + state.pulse * 20;
    const coreGradient = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius * 2.2);
    coreGradient.addColorStop(0, `hsla(${200 + state.hueShift * 120}, 100%, 78%, 0.8)`);
    coreGradient.addColorStop(0.35, `hsla(${260 + state.hueShift * 70}, 95%, 60%, 0.4)`);
    coreGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${150 + state.hueShift * 100}, 100%, 70%, ${0.35 + frame.beat * 0.55})`;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  },
  cleanup: () => {
    particles.length = 0;
  },
};
