import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const currentFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFile), "..");

  const analysisPath = path.resolve(projectRoot, requiredArg(args, "analysis"));
  const audioPath = path.resolve(projectRoot, requiredArg(args, "audio"));
  const outputPath = path.resolve(projectRoot, requiredArg(args, "output"));
  const scene = args.scene ?? "barsNeo";
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

    await page.evaluate(
      ({ data, targetScene }) => {
        window.dailyMusicOffline?.loadAnalysisObject(data, targetScene);
      },
      { data: analysis, targetScene: scene }
    );

    const duration = await page.evaluate(() => window.dailyMusicOffline?.getDuration() ?? 0);
    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    const canvas = page.locator("#renderCanvas");

    for (let i = 0; i < totalFrames; i += 1) {
      const t = i / fps;
      await page.evaluate((time) => {
        window.dailyMusicOffline?.seek(time);
      }, t);
      await page.waitForTimeout(18);
      const framePath = path.join(frameDir, `frame_${String(i).padStart(6, "0")}.png`);
      await canvas.screenshot({ path: framePath });
      if (i % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
        const pct = ((i / totalFrames) * 100).toFixed(0);
        process.stdout.write(`渲染进度 ${pct}%\n`);
      }
    }

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
