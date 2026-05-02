import badAppleLrcRaw from "../../../assets/badApple.lrc?raw";

interface SubtitleCue {
  startSec: number;
  endSec: number;
  text: string;
}

export interface SubtitleFrame {
  text: string;
  alpha: number;
}

const TIME_TAG_RE = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const DEFAULT_END_PADDING_SEC = 4;

function parseTimeTag(minuteText: string, secondText: string, fractionalText: string | undefined): number {
  const minutes = Number.parseInt(minuteText, 10);
  const seconds = Number.parseInt(secondText, 10);
  let milliseconds = 0;
  if (fractionalText) {
    const normalized = fractionalText.padEnd(3, "0").slice(0, 3);
    milliseconds = Number.parseInt(normalized, 10);
  }
  return minutes * 60 + seconds + milliseconds / 1000;
}

function parseLrc(raw: string): SubtitleCue[] {
  const entries: Array<{ startSec: number; text: string }> = [];
  const lines = raw.replace(/\r/g, "").split("\n");

  for (const line of lines) {
    const tags = [...line.matchAll(TIME_TAG_RE)];
    if (tags.length === 0) {
      continue;
    }
    const text = line.replace(TIME_TAG_RE, "").trim();
    for (const tag of tags) {
      const [, minuteText, secondText, fractionalText] = tag;
      entries.push({
        startSec: parseTimeTag(minuteText, secondText, fractionalText),
        text,
      });
    }
  }

  entries.sort((a, b) => a.startSec - b.startSec);

  const cues: SubtitleCue[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index];
    const next = entries[index + 1];
    const fallbackEnd = current.startSec + DEFAULT_END_PADDING_SEC;
    const endSec = next ? Math.max(current.startSec, next.startSec) : fallbackEnd;
    cues.push({
      startSec: current.startSec,
      endSec,
      text: current.text,
    });
  }
  return cues;
}

const subtitleCues = parseLrc(badAppleLrcRaw);

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function findCueIndexAt(timeSec: number): number {
  let low = 0;
  let high = subtitleCues.length - 1;
  let result = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (subtitleCues[middle].startSec <= timeSec) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

export function getSubtitleFrameAt(timeSec: number, trackDurationSec: number, fadeDurationMs: number): SubtitleFrame | null {
  if (!Number.isFinite(timeSec) || subtitleCues.length === 0) {
    return null;
  }
  const cueIndex = findCueIndexAt(timeSec);
  if (cueIndex < 0) {
    return null;
  }

  const cue = subtitleCues[cueIndex];
  const cueEnd = Math.min(cue.endSec, Number.isFinite(trackDurationSec) ? trackDurationSec : cue.endSec);
  if (timeSec < cue.startSec || timeSec >= cueEnd || cue.text.length === 0) {
    return null;
  }

  const fadeSec = Math.max(0, fadeDurationMs) / 1000;
  if (fadeSec <= 0) {
    return { text: cue.text, alpha: 1 };
  }

  const fadeIn = clamp01((timeSec - cue.startSec) / fadeSec);
  const fadeOut = clamp01((cueEnd - timeSec) / fadeSec);
  return {
    text: cue.text,
    alpha: Math.min(fadeIn, fadeOut),
  };
}
