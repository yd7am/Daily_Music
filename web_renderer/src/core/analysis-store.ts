import type { AnalysisData } from "../types/analysis";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateAnalysis(data: unknown): asserts data is AnalysisData {
  if (!data || typeof data !== "object") {
    throw new Error("analysis.json 不是有效对象。");
  }

  const parsed = data as Partial<AnalysisData>;
  if (!parsed.meta || !parsed.frames) {
    throw new Error("analysis.json 缺少 meta 或 frames 字段。");
  }

  if (!Array.isArray(parsed.frames) || parsed.frames.length === 0) {
    throw new Error("analysis.json frames 不能为空。");
  }

  const firstFrame = parsed.frames[0];
  if (!firstFrame || !Array.isArray(firstFrame.spectrum)) {
    throw new Error("analysis.json frame.spectrum 格式错误。");
  }

  if (!isFiniteNumber(parsed.meta.analysisFps) || parsed.meta.analysisFps <= 0) {
    throw new Error("analysis.json meta.analysisFps 必须大于 0。");
  }
}

export async function loadAnalysisFromFile(file: File): Promise<AnalysisData> {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as unknown;
  validateAnalysis(parsed);
  return parsed;
}

export async function loadAnalysisFromUrl(url: string): Promise<AnalysisData> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`加载 analysis 失败: ${res.status}`);
  }
  const parsed = (await res.json()) as unknown;
  validateAnalysis(parsed);
  return parsed;
}
