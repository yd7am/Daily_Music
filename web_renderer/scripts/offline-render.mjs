import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const RENDER_CONTROL_KEYS = [
  "particleSpeed",
  "particleStyleMode",
  "particleSeed",
  "particleShardDensity",
  "particle3DRotation",
  "subtitleSize",
  "circleCoverScale",
  "circleHudGap",
  "circleVibration",
  "circleSpectrumGain",
  "circleLineWidth",
  "circleGlowStrength",
  "circleSpacing",
  "circleLineCount",
];

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = next;
    i += 1;
  }
  return parsed;
}

function requiredArg(args, key) {
  const value = args[key];
  if (!value) {
    throw new Error(`缺少参数 --${key}`);
  }
  return value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function parseRendererConfig(rawConfig) {
  if (!isRecord(rawConfig)) {
    return null;
  }

  const controlsSource = isRecord(rawConfig.controls) ? rawConfig.controls : rawConfig;
  const controls = {};
  for (const key of RENDER_CONTROL_KEYS) {
    const value = controlsSource[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      controls[key] = value;
    }
  }

  const presetId = typeof rawConfig.presetId === "string" ? rawConfig.presetId : undefined;
  const sceneId = typeof rawConfig.sceneId === "string" ? rawConfig.sceneId : undefined;
  const trackTitle =
    typeof rawConfig.trackTitle === "string"
      ? rawConfig.trackTitle
      : typeof rawConfig.title === "string"
        ? rawConfig.title
        : undefined;
  const trackArtist =
    typeof rawConfig.trackArtist === "string"
      ? rawConfig.trackArtist
      : typeof rawConfig.artist === "string"
        ? rawConfig.artist
        : undefined;
  const trackFont =
    typeof rawConfig.trackFont === "string"
      ? rawConfig.trackFont
      : typeof rawConfig.fontKey === "string"
        ? rawConfig.fontKey
        : typeof rawConfig.font === "string"
          ? rawConfig.font
          : undefined;
  const subtitleFont =
    typeof rawConfig.subtitleFont === "string"
      ? rawConfig.subtitleFont
      : typeof rawConfig.subtitleFontKey === "string"
        ? rawConfig.subtitleFontKey
        : undefined;
  if (
    !presetId &&
    !sceneId &&
    !trackTitle &&
    !trackArtist &&
    !trackFont &&
    !subtitleFont &&
    Object.keys(controls).length === 0
  ) {
    return null;
  }
  return {
    presetId,
    sceneId,
    trackTitle,
    trackArtist,
    trackFont,
    subtitleFont,
    controls,
  };
}

function loadRendererConfig(projectRoot, args) {
  const explicitPath = typeof args.controls === "string" ? args.controls : null;
  const resolvedPath = explicitPath
    ? path.resolve(projectRoot, explicitPath)
    : path.resolve(projectRoot, "render-controls.json");

  if (!existsSync(resolvedPath)) {
    if (explicitPath) {
      throw new Error(`渲染参数文件不存在: ${resolvedPath}`);
    }
    return null;
  }

  const raw = JSON.parse(readFileSync(resolvedPath, "utf-8"));
  const config = parseRendererConfig(raw);
  if (!config) {
    throw new Error(`渲染参数文件格式无效: ${resolvedPath}`);
  }

  return {
    path: resolvedPath,
    config,
  };
}

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch (_err) {
      // Wait for server.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Vite 服务器未就绪: ${url}`);
}

function spawnCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} 执行失败，退出码 ${code}`));
      }
    });
  });
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "--:--";
  }
  const rounded = Math.max(0, Math.floor(totalSeconds + 0.5));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const currentFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFile), "..");

  const analysisPath = path.resolve(projectRoot, requiredArg(args, "analysis"));
  const audioPath = path.resolve(projectRoot, requiredArg(args, "audio"));
  const outputPath = path.resolve(projectRoot, requiredArg(args, "output"));
  const rendererConfig = loadRendererConfig(projectRoot, args);
  const targetScene = args.scene ?? rendererConfig?.config.sceneId ?? "barsNeo";
  const fps = Number.parseInt(args.fps ?? "30", 10);
  const width = Number.parseInt(args.width ?? "1920", 10);
  const height = Number.parseInt(args.height ?? "1080", 10);
  const port = Number.parseInt(args.port ?? "4173", 10);
  const keepFrames = args.keepFrames === "true";

  if (!existsSync(analysisPath)) {
    throw new Error(`analysis 文件不存在: ${analysisPath}`);
  }
  if (!existsSync(audioPath)) {
    throw new Error(`音频文件不存在: ${audioPath}`);
  }

  const outputDir = path.dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });
  const frameDir = mkdtempSync(path.join(tmpdir(), "daily-music-frames-"));

  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const viteProc = spawn(npxCommand, ["vite", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: projectRoot,
    stdio: "pipe",
  });

  let browser = null;
  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl);

    const analysis = JSON.parse(readFileSync(analysisPath, "utf-8"));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${baseUrl}/?offline=1&width=${width}&height=${height}`, {
      waitUntil: "domcontentloaded",
    });

    if (rendererConfig) {
      process.stdout.write(`读取渲染参数: ${rendererConfig.path}\n`);
      await page.evaluate((config) => {
        window.dailyMusicOffline?.applyRendererConfig(config);
      }, rendererConfig.config);
    }

    await page.evaluate(
      ({ data, targetScene }) => {
        window.dailyMusicOffline?.loadAnalysisObject(data, targetScene);
      },
      { data: analysis, targetScene }
    );

    const duration = await page.evaluate(() => window.dailyMusicOffline?.getDuration() ?? 0);
    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    const canvas = page.locator("#renderCanvas");
    const renderStartTimeMs = Date.now();
    let lastProgressLogTimeMs = 0;
    let lastProgressPercentBucket = -1;

    process.stdout.write(
      `开始逐帧渲染: duration=${duration.toFixed(3)}s, totalFrames=${totalFrames}, output=${width}x${height}@${fps}fps\n`
    );

    for (let i = 0; i < totalFrames; i += 1) {
      const t = i / fps;
      await page.evaluate((time) => {
        window.dailyMusicOffline?.seek(time);
      }, t);
      await page.waitForTimeout(18);
      const framePath = path.join(frameDir, `frame_${String(i).padStart(6, "0")}.png`);
      await canvas.screenshot({ path: framePath });

      const completedFrames = i + 1;
      const progressRatio = completedFrames / totalFrames;
      const progressPercent = progressRatio * 100;
      const progressPercentBucket = Math.floor(progressPercent);
      const nowMs = Date.now();
      const elapsedSec = Math.max(0.001, (nowMs - renderStartTimeMs) / 1000);
      const renderFps = completedFrames / elapsedSec;
      const remainingFrames = Math.max(0, totalFrames - completedFrames);
      const etaSec = renderFps > 0 ? remainingFrames / renderFps : Infinity;
      const shouldLog =
        completedFrames === 1 ||
        completedFrames === totalFrames ||
        progressPercentBucket > lastProgressPercentBucket ||
        nowMs - lastProgressLogTimeMs >= 2000;

      if (shouldLog) {
        process.stdout.write(
          `渲染进度 ${progressPercent.toFixed(1)}% (${completedFrames}/${totalFrames}) | 速度 ${renderFps.toFixed(
            2
          )} 帧/s | 已耗时 ${formatDuration(elapsedSec)} | 预计剩余 ${formatDuration(etaSec)}\n`
        );
        lastProgressLogTimeMs = nowMs;
        lastProgressPercentBucket = progressPercentBucket;
      }
    }

    process.stdout.write("逐帧渲染完成，开始调用 ffmpeg 合成 MP4...\n");
    await spawnCommand(
      "ffmpeg",
      [
        "-y",
        "-framerate",
        String(fps),
        "-start_number",
        "0",
        "-i",
        path.join(frameDir, "frame_%06d.png"),
        "-i",
        audioPath,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outputPath,
      ],
      { stdio: "inherit" }
    );

    process.stdout.write(`离线导出完成: ${outputPath}\n`);
  } finally {
    if (browser) {
      await browser.close();
    }
    viteProc.kill("SIGTERM");
    if (!keepFrames) {
      rmSync(frameDir, { recursive: true, force: true });
    } else {
      process.stdout.write(`保留帧目录: ${frameDir}\n`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
