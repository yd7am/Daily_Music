export type TrackFontKey =
  | "patrick-hand"
  | "caveat"
  | "kalam"
  | "indie-flower"
  | "amatic-sc"
  | "orbitron"
  | "audiowide";

export interface TrackFontOption {
  key: TrackFontKey;
  label: string;
  cssFamily: string;
}

export interface TrackOverlayInfo {
  title: string;
  artist: string;
  fontKey: TrackFontKey;
}

export interface TrackOverlayUpdate {
  title?: unknown;
  artist?: unknown;
  fontKey?: unknown;
}

export const TRACK_FONT_OPTIONS: TrackFontOption[] = [
  { key: "patrick-hand", label: "Patrick Hand (手写)", cssFamily: '"Patrick Hand", "Comic Sans MS", cursive' },
  { key: "caveat", label: "Caveat (随性)", cssFamily: '"Caveat", "Comic Sans MS", cursive' },
  { key: "kalam", label: "Kalam (墨迹)", cssFamily: '"Kalam", "Comic Sans MS", cursive' },
  { key: "indie-flower", label: "Indie Flower (轻松)", cssFamily: '"Indie Flower", "Comic Sans MS", cursive' },
  { key: "amatic-sc", label: "Amatic SC (细长手写)", cssFamily: '"Amatic SC", "Comic Sans MS", cursive' },
  { key: "orbitron", label: "Orbitron (科幻)", cssFamily: '"Orbitron", "Segoe UI", sans-serif' },
  { key: "audiowide", label: "Audiowide (电子)", cssFamily: '"Audiowide", "Segoe UI", sans-serif' },
];

const FONT_FAMILY_MAP: Record<TrackFontKey, string> = Object.fromEntries(
  TRACK_FONT_OPTIONS.map((item) => [item.key, item.cssFamily])
) as Record<TrackFontKey, string>;

const DEFAULT_TRACK_FONT: TrackFontKey = "patrick-hand";

const overlayInfo: TrackOverlayInfo = {
  title: "",
  artist: "",
  fontKey: DEFAULT_TRACK_FONT,
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeFontKey(value: unknown): TrackFontKey {
  if (typeof value !== "string") {
    return DEFAULT_TRACK_FONT;
  }
  return value in FONT_FAMILY_MAP ? (value as TrackFontKey) : DEFAULT_TRACK_FONT;
}

export function getTrackOverlayInfo(): TrackOverlayInfo {
  return {
    title: overlayInfo.title,
    artist: overlayInfo.artist,
    fontKey: overlayInfo.fontKey,
  };
}

export function getTrackFontFamily(): string {
  return FONT_FAMILY_MAP[overlayInfo.fontKey] ?? FONT_FAMILY_MAP[DEFAULT_TRACK_FONT];
}

export function setTrackOverlayInfo(next: TrackOverlayUpdate): void {
  if (Object.prototype.hasOwnProperty.call(next, "title")) {
    overlayInfo.title = normalizeText(next.title);
  }
  if (Object.prototype.hasOwnProperty.call(next, "artist")) {
    overlayInfo.artist = normalizeText(next.artist);
  }
  if (Object.prototype.hasOwnProperty.call(next, "fontKey")) {
    overlayInfo.fontKey = normalizeFontKey(next.fontKey);
  }
}
