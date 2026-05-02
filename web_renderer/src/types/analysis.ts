export type SegmentLabel =
  | "intro"
  | "verse"
  | "build"
  | "drop"
  | "breakdown"
  | "outro"
  | "custom";

export interface AnalysisMeta {
  version: string;
  sourceAudio: string;
  sampleRate: number;
  duration: number;
  analysisFps: number;
  bands: number;
  hopLength: number;
  fftSize: number;
  generatedAt: string;
  configSnapshot?: Record<string, unknown>;
}

export interface AnalysisFrame {
  t: number;
  spectrum: number[];
  rms: number;
  onset: number;
  beat: number;
  centroid: number;
  energy: number;
  flux?: number;
  rolloff?: number;
}

export interface AnalysisSegment {
  start: number;
  end: number;
  label: SegmentLabel;
  intensity?: number;
}

export interface AnalysisData {
  meta: AnalysisMeta;
  frames: AnalysisFrame[];
  segments?: AnalysisSegment[];
}
