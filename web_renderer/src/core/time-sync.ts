import type { AnalysisData, AnalysisFrame } from "../types/analysis";

export class TimeSyncController {
  private data: AnalysisData;

  constructor(data: AnalysisData) {
    this.data = data;
  }

  getFrameByTime(timeSec: number): AnalysisFrame {
    const fps = this.data.meta.analysisFps;
    const idx = Math.min(
      this.data.frames.length - 1,
      Math.max(0, Math.floor(timeSec * fps))
    );
    return this.data.frames[idx];
  }

  getProgress(timeSec: number): number {
    if (this.data.meta.duration <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, timeSec / this.data.meta.duration));
  }
}
