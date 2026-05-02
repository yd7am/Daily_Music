export type SubtitleFontKey =
  | "noto-sans-jp"
  | "m-plus-rounded"
  | "zen-maru"
  | "kosugi-maru"
  | "sawarabi-gothic"
  | "shippori-mincho";

export interface SubtitleFontOption {
  key: SubtitleFontKey;
  label: string;
  cssFamily: string;
}

export const SUBTITLE_FONT_OPTIONS: SubtitleFontOption[] = [
  { key: "noto-sans-jp", label: "Noto Sans JP（默认）", cssFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif' },
  {
    key: "m-plus-rounded",
    label: "M PLUS Rounded（圆润）",
    cssFamily: '"M PLUS Rounded 1c", "Hiragino Sans", sans-serif',
  },
  { key: "zen-maru", label: "Zen Maru Gothic（柔和）", cssFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif' },
  { key: "kosugi-maru", label: "Kosugi Maru（清晰）", cssFamily: '"Kosugi Maru", "Hiragino Sans", sans-serif' },
  {
    key: "sawarabi-gothic",
    label: "Sawarabi Gothic（朴素）",
    cssFamily: '"Sawarabi Gothic", "Hiragino Sans", sans-serif',
  },
  {
    key: "shippori-mincho",
    label: "Shippori Mincho（明朝）",
    cssFamily: '"Shippori Mincho", "Hiragino Mincho ProN", serif',
  },
];

const FONT_FAMILY_MAP: Record<SubtitleFontKey, string> = Object.fromEntries(
  SUBTITLE_FONT_OPTIONS.map((item) => [item.key, item.cssFamily])
) as Record<SubtitleFontKey, string>;

const DEFAULT_SUBTITLE_FONT: SubtitleFontKey = "noto-sans-jp";

const subtitleStyle = {
  fontKey: DEFAULT_SUBTITLE_FONT as SubtitleFontKey,
};

export function getSubtitleFontFamily(): string {
  return FONT_FAMILY_MAP[subtitleStyle.fontKey] ?? FONT_FAMILY_MAP[DEFAULT_SUBTITLE_FONT];
}

export function getSubtitleStyle(): { fontKey: SubtitleFontKey } {
  return {
    fontKey: subtitleStyle.fontKey,
  };
}

export function setSubtitleStyle(next: { fontKey?: unknown }): void {
  if (!Object.prototype.hasOwnProperty.call(next, "fontKey")) {
    return;
  }
  const value = next.fontKey;
  if (typeof value !== "string") {
    subtitleStyle.fontKey = DEFAULT_SUBTITLE_FONT;
    return;
  }
  subtitleStyle.fontKey = value in FONT_FAMILY_MAP ? (value as SubtitleFontKey) : DEFAULT_SUBTITLE_FONT;
}
