import type { SceneDefinition } from "../core/scene-types";
import { getRenderControls } from "../core/render-controls";
import { getSubtitleFontFamily } from "../core/subtitle-overlay";
import { getSubtitleFrameAt } from "../core/subtitle-track";
import { getTrackFontFamily, getTrackOverlayInfo } from "../core/track-overlay";
import type { AnalysisData } from "../types/analysis";
import badAppleCoverUrl from "../../../assets/badApple.png";

let barCount = 0;
let lastEmitT = -1;
let trackDurationSec = 0;

interface PulseParticle {
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

const pulseParticles: PulseParticle[] = [];
const SUBTITLE_FADE_DURATION_MS = 250;
const COVER_ROTATION_SPEED = 0.08;
const REFERENCE_WIDTH = 1280;
const REFERENCE_HEIGHT = 720;

const coverImage = new Image();
let coverImageReady = false;
let coverImageFailed = false;
coverImage.decoding = "async";
coverImage.onload = () => {
  coverImageReady = true;
  coverImageFailed = false;
};
coverImage.onerror = () => {
  coverImageReady = false;
  coverImageFailed = true;
};
coverImage.src = badAppleCoverUrl;

function drawCenterCover(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseRadius: number,
  coverScale: number,
  resolutionScale: number,
  rotationRad: number
): void {
  if (!coverImageReady || coverImageFailed) {
    return;
  }

  const coverRadius = baseRadius * coverScale;
  const diameter = coverRadius * 2;
  const sourceSize = Math.max(1, Math.min(coverImage.naturalWidth, coverImage.naturalHeight));
  const sx = Math.max(0, (coverImage.naturalWidth - sourceSize) * 0.5);
  const sy = Math.max(0, (coverImage.naturalHeight - sourceSize) * 0.5);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotationRad);
  ctx.beginPath();
  ctx.arc(0, 0, coverRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(coverImage, sx, sy, sourceSize, sourceSize, -coverRadius, -coverRadius, diameter, diameter);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotationRad);
  ctx.strokeStyle = "rgba(236, 245, 255, 0.85)";
  ctx.lineWidth = 1.6 * resolutionScale;
  ctx.beginPath();
  ctx.arc(0, 0, coverRadius + 0.8 * resolutionScale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const rounded = Math.floor(seconds + 1e-6);
  const mm = Math.floor(rounded / 60);
  const ss = rounded % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function drawPlaybackHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerY: number,
  baseRadius: number,
  hudGap: number,
  progress: number,
  currentTimeSec: number,
  subtitleSizeScale: number,
  glowStrength: number
): void {
  const trackInfo = getTrackOverlayInfo();
  const titleText = trackInfo.title || "Untitled Track";
  const artistText = trackInfo.artist || "";
  const fontFamily = getTrackFontFamily();
  const resolutionScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT);

  const hudWidth = Math.min(width * 0.86, 980 * resolutionScale);
  const hudX = (width - hudWidth) * 0.5;
  const stableY = centerY + baseRadius + hudGap * resolutionScale;
  const hudY = Math.max(height * 0.58, Math.min(stableY, height - 90 * resolutionScale));
  const barHeight = Math.max(7 * resolutionScale, Math.round(height * 0.011));
  const titleFontSize = Math.max(22 * resolutionScale, Math.round(width * 0.028));
  const artistFontSize = Math.max(20 * resolutionScale, Math.round(width * 0.024));
  const timeFontSize = Math.max(16 * resolutionScale, Math.round(width * 0.018));
  const baseSubtitleSize = Math.min(44 * resolutionScale, Math.max(22 * resolutionScale, Math.round(width * 0.026)));
  const subtitleFontSize = Math.min(84 * resolutionScale, Math.max(14 * resolutionScale, baseSubtitleSize * subtitleSizeScale));
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const cursorX = hudX + hudWidth * clampedProgress;

  ctx.save();
  ctx.lineCap = "round";

  const titleBaseY = hudY - 15;

  ctx.font = `${titleFontSize}px ${fontFamily}`;
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.shadowColor = `rgba(132, 228, 255, ${0.25 + glowStrength * 0.14})`;
  ctx.shadowBlur = 6 + glowStrength * 5;
  ctx.fillText(titleText, hudX, titleBaseY);

  if (artistText) {
    ctx.font = `${artistFontSize}px ${fontFamily}`;
    ctx.textAlign = "right";
    ctx.fillText(artistText, hudX + hudWidth, titleBaseY);
    ctx.textAlign = "left";
  }

  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(hudX, hudY, hudWidth, barHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.76)";
  ctx.lineWidth = 1.4 * resolutionScale;
  ctx.strokeRect(hudX, hudY, hudWidth, barHeight);

  const progressGradient = ctx.createLinearGradient(hudX, 0, hudX + hudWidth, 0);
  progressGradient.addColorStop(0, "rgba(83, 235, 255, 0.96)");
  progressGradient.addColorStop(0.58, "rgba(120, 207, 255, 0.9)");
  progressGradient.addColorStop(1, "rgba(178, 151, 255, 0.88)");
  ctx.fillStyle = progressGradient;
  ctx.fillRect(hudX, hudY, hudWidth * clampedProgress, barHeight);

  ctx.strokeStyle = "rgba(171, 255, 255, 0.95)";
  ctx.lineWidth = 1.1 * resolutionScale;
  ctx.beginPath();
  ctx.moveTo(cursorX, hudY - 3 * resolutionScale);
  ctx.lineTo(cursorX, hudY + barHeight + 6 * resolutionScale);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.moveTo(cursorX, hudY + barHeight + 3 * resolutionScale);
  ctx.lineTo(cursorX - 5 * resolutionScale, hudY + barHeight + 12 * resolutionScale);
  ctx.lineTo(cursorX + 5 * resolutionScale, hudY + barHeight + 12 * resolutionScale);
  ctx.closePath();
  ctx.fill();

  ctx.font = `${timeFontSize}px ${fontFamily}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(248, 248, 255, 0.9)";
  const currentTimeText = formatClock(currentTimeSec);
  const totalTimeText = formatClock(trackDurationSec);
  const timeY = hudY + barHeight + 12 * resolutionScale;
  ctx.textAlign = "left";
  ctx.fillText(currentTimeText, hudX, timeY);
  ctx.textAlign = "right";
  ctx.fillText(totalTimeText, hudX + hudWidth, timeY);
  ctx.textAlign = "left";

  const subtitleFrame = getSubtitleFrameAt(currentTimeSec, trackDurationSec, SUBTITLE_FADE_DURATION_MS);
  if (subtitleFrame) {
    const subtitleY = Math.min(timeY + timeFontSize + 10 * resolutionScale, height - subtitleFontSize - 14 * resolutionScale);
    const subtitleAlpha = Math.max(0, Math.min(1, subtitleFrame.alpha));
    const subtitleFontFamily = getSubtitleFontFamily();
    ctx.font = `${subtitleFontSize}px ${subtitleFontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = `rgba(248, 249, 255, ${0.94 * subtitleAlpha})`;
    ctx.shadowColor = `rgba(58, 125, 255, ${0.48 * subtitleAlpha})`;
    ctx.shadowBlur = 12 * subtitleAlpha + glowStrength * 4;
    ctx.fillText(subtitleFrame.text, width * 0.5, subtitleY);
    ctx.textAlign = "left";
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  ctx.restore();
}

function emitPulseParticles(
  cx: number,
  cy: number,
  amount: number,
  hueShift: number,
  intensity: number,
  speedScale: number
): void {
  const count = Math.max(6, Math.floor(amount));
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (220 + Math.random() * 360 * (0.45 + intensity)) * speedScale;
    const startX = cx;
    const startY = cy;
    pulseParticles.push({
      x: startX,
      y: startY,
      prevX: startX,
      prevY: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 2.2 + Math.random() * 1.8,
      maxLife: 2.2 + Math.random() * 1.8,
      size: 1.8 + Math.random() * 3.6,
      hue: (Math.random() * 100 + 200 + hueShift * 120) % 360,
    });
  }
}

export const circlePulseScene: SceneDefinition = {
  id: "circlePulse",
  label: "Circle Pulse",
  initialize: (data: AnalysisData) => {
    barCount = data.meta.bands;
    trackDurationSec = data.meta.duration;
    lastEmitT = -1;
    pulseParticles.length = 0;
  },
  render: (ctx, frame, rc, state) => {
    const { width, height, deltaTime } = rc;
    const controls = getRenderControls();
    const resolutionScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT);
    const cx = width * 0.5;
    const cy = height * 0.5;

    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.7);
    bg.addColorStop(0, `hsla(${220 + state.hueShift * 80}, 70%, 14%, 1)`);
    bg.addColorStop(1, `hsla(${250 + state.hueShift * 60}, 80%, 4%, 1)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const vibration = controls.circleVibration;
    const spectrumGain = controls.circleSpectrumGain;
    const lineWidthScale = controls.circleLineWidth;
    const glowStrength = controls.circleGlowStrength;
    const baseRadius = Math.min(width, height) * 0.22;
    const pulseRadius = baseRadius + frame.energy * (120 * vibration) + state.pulse * (36 * vibration);
    const rotationRad = rc.now * COVER_ROTATION_SPEED;

    drawCenterCover(ctx, cx, cy, baseRadius, controls.circleCoverScale, resolutionScale, rotationRad);

    const spectrum = frame.spectrum;
    const sourceCount = Math.max(1, Math.min(spectrum.length, barCount || spectrum.length));
    const count = Math.max(
      12,
      Math.min(sourceCount, Math.round(controls.circleLineCount / controls.circleSpacing))
    );
    const step = (Math.PI * 2) / count;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRad);
    ctx.lineCap = "round";

    const spectralAura = ctx.createRadialGradient(0, 0, pulseRadius * 0.82, 0, 0, pulseRadius * 1.48);
    spectralAura.addColorStop(0, `hsla(${220 + state.hueShift * 70}, 100%, 50%, 0)`);
    spectralAura.addColorStop(1, `hsla(${286 + state.hueShift * 90}, 100%, 62%, ${(0.12 + state.glow * 0.18) * glowStrength})`);
    ctx.strokeStyle = spectralAura;
    ctx.lineWidth = (6 + state.glow * 8) * glowStrength * resolutionScale;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius + 2, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < count; i += 1) {
      const spectrumIdx = Math.floor((i / count) * spectrum.length);
      const amp = spectrum[spectrumIdx] ?? 0;
      const angle = i * step;
      const waveOffset =
        Math.sin(rc.now * 4.1 + i * 0.37 + state.pulse * 3.4) *
        (2.5 + amp * 11) *
        (0.35 + state.glow * 0.65);
      const lineLength = Math.max(
        8 * resolutionScale,
        (12 + amp * (110 * spectrumGain) + state.glow * (18 * spectrumGain) + waveOffset) * resolutionScale
      );
      const inner = pulseRadius + Math.sin(rc.now * 2.6 + i * 0.22) * (1 + state.pulse * 2.2) * resolutionScale;
      const outer = pulseRadius + lineLength;
      const hue = (i * (360 / count) + state.hueShift * 140) % 360;

      const x1 = Math.cos(angle) * inner;
      const y1 = Math.sin(angle) * inner;
      const x2 = Math.cos(angle) * outer;
      const y2 = Math.sin(angle) * outer;

      const beamGradient = ctx.createLinearGradient(x1, y1, x2, y2);
      beamGradient.addColorStop(0, `hsla(${hue - 20}, 100%, ${42 + amp * 16}%, ${0.22 + amp * 0.38})`);
      beamGradient.addColorStop(0.62, `hsla(${hue + 10}, 100%, ${57 + amp * 20}%, ${0.46 + amp * 0.38})`);
      beamGradient.addColorStop(1, `hsla(${hue + 44}, 100%, ${72 + amp * 16}%, ${0.62 + amp * 0.36})`);
      ctx.strokeStyle = beamGradient;
      ctx.shadowColor = `hsla(${hue + 38}, 100%, 62%, ${0.3 + amp * 0.48})`;
      ctx.shadowBlur = (6 + amp * 24 + state.glow * 12) * glowStrength;
      ctx.lineWidth = (1.2 + amp * 2.7) * lineWidthScale * resolutionScale;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (amp > 0.18) {
        ctx.fillStyle = `hsla(${hue + 52}, 100%, ${68 + amp * 16}%, ${0.24 + amp * 0.52})`;
        ctx.shadowColor = `hsla(${hue + 52}, 100%, 66%, ${0.35 + amp * 0.45})`;
        ctx.shadowBlur = (8 + amp * 14 + state.glow * 10) * glowStrength;
        ctx.beginPath();
        ctx.arc(x2, y2, (0.5 + amp * 1.8) * lineWidthScale * resolutionScale, 0, Math.PI * 2);
        ctx.fill();

        if (amp > 0.45 && Math.random() < 0.24 + state.particleBurst * 0.38) {
          const sparkAngle = angle + (Math.random() - 0.5) * 0.12;
          const sparkDist = outer + (2 + Math.random() * 9) * resolutionScale;
          const sparkX = Math.cos(sparkAngle) * sparkDist;
          const sparkY = Math.sin(sparkAngle) * sparkDist;
          ctx.fillStyle = `hsla(${hue + 70}, 100%, 78%, ${0.16 + amp * 0.34})`;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, (0.4 + amp * 1.2) * lineWidthScale * resolutionScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    const waveRingRadius =
      pulseRadius + 9 * resolutionScale + Math.sin(rc.now * 3.6 + frame.t * 2.1) * (2 + state.pulse * 7 + frame.energy * 3) * resolutionScale;
    ctx.strokeStyle = `hsla(${245 + state.hueShift * 90}, 100%, ${60 + frame.energy * 18}%, ${0.22 + state.glow * 0.34})`;
    ctx.lineWidth = (1.8 + state.glow * 2.6) * glowStrength * resolutionScale;
    ctx.beginPath();
    ctx.arc(0, 0, waveRingRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const ringGlow = ctx.createRadialGradient(cx, cy, pulseRadius * 0.85, cx, cy, pulseRadius * 1.45);
    ringGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
    ringGlow.addColorStop(1, `hsla(${290 + state.hueShift * 70}, 100%, 62%, ${0.15 + state.glow * 0.25})`);
    ctx.strokeStyle = ringGlow;
    ctx.lineWidth = (10 + frame.rms * 18) * resolutionScale;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    const triggerValue = Math.max(
      frame.onset * 1.2,
      frame.beat,
      state.particleBurst * 0.9,
      frame.energy * 0.75
    );
    if (triggerValue > 0.14 && frame.t - lastEmitT > 0.04) {
      lastEmitT = frame.t;
      emitPulseParticles(
        cx,
        cy,
        8 + triggerValue * 80,
        state.hueShift,
        triggerValue,
        controls.particleSpeed
      );
    }

    const dt = deltaTime || 1 / 60;
    const fadeZone = 14;
    const outLimit = Math.max(width, height) * 0.88;
    for (let i = pulseParticles.length - 1; i >= 0; i -= 1) {
      const p = pulseParticles[i];
      p.life -= dt;
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.998;
      p.vy *= 0.998;

      const dist = Math.hypot(p.x - cx, p.y - cy);

      if (
        p.life <= 0 ||
        dist > outLimit ||
        p.x < -80 ||
        p.x > width + 80 ||
        p.y < -80 ||
        p.y > height + 80
      ) {
        pulseParticles.splice(i, 1);
        continue;
      }

      let distanceAlpha = 1;
      if (dist < pulseRadius - fadeZone) {
        // Mimic Python behavior: invisible while particle is inside the ring.
        continue;
      } else if (dist < pulseRadius + fadeZone) {
        distanceAlpha = (dist - (pulseRadius - fadeZone)) / (2 * fadeZone);
      }

      const alpha = p.life / p.maxLife;
      const finalAlpha = Math.max(0.03, alpha * distanceAlpha);

      ctx.strokeStyle = `hsla(${p.hue}, 100%, ${66 + frame.energy * 22}%, ${finalAlpha * 0.5})`;
      ctx.lineWidth = Math.max(0.8 * resolutionScale, p.size * 0.4 * resolutionScale);
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.fillStyle = `hsla(${p.hue}, 100%, ${68 + frame.energy * 22}%, ${finalAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.55 + alpha) * resolutionScale, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPlaybackHud(
      ctx,
      width,
      height,
      cy,
      baseRadius,
      controls.circleHudGap,
      rc.progress,
      frame.t,
      controls.subtitleSize,
      glowStrength
    );
  },
  cleanup: () => {
    pulseParticles.length = 0;
    trackDurationSec = 0;
    lastEmitT = -1;
  },
};
