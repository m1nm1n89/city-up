export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASONS: readonly Season[] = ["spring", "summer", "autumn", "winter"];

export const SEASON_LABELS: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

/** 各季節のテーマカラー(空・地面)。プレースホルダーの色付け用。 */
export const SEASON_THEME: Record<
  Season,
  { sky: string; ground: string; accent: string }
> = {
  spring: { sky: "#FFE4EC", ground: "#A8D8A8", accent: "#FFB7C5" }, // 桜色
  summer: { sky: "#A4D8FF", ground: "#7FCE5C", accent: "#FFD93D" }, // 太陽
  autumn: { sky: "#FFD6A5", ground: "#C19A6B", accent: "#9B9B9B" }, // 焼き芋の煙
  winter: { sky: "#D6E6F2", ground: "#F0F4F8", accent: "#FFFFFF" }, // 雪
};
