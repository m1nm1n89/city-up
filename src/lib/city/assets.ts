import type { Era } from "./eras";

/**
 * 建物のプレースホルダー視覚定義。
 * 後でイラスト素材に差し替える時、ここを編集すれば全画面で反映される。
 */
export type BuildingStyle = {
  /** 表示色 */
  color: string;
  /** 屋根の色(あれば) */
  roof?: string;
  /** ベース幅(px) */
  width: number;
  /** ベース高さ(px) */
  height: number;
  /** 屋根の形 */
  roofShape: "triangle" | "flat" | "dome" | "antenna" | "none";
  /** 煙突から煙が出るか */
  smoke?: boolean;
};

export const BUILDING_STYLE: Record<Era, BuildingStyle[]> = {
  primitive: [
    { color: "#A4724E", width: 50,  height: 36, roofShape: "triangle", roof: "#6E4B2E" },
    { color: "#8B5A3C", width: 44,  height: 32, roofShape: "triangle", roof: "#6E4B2E" },
  ],
  ancient: [
    { color: "#C9A66B", width: 56,  height: 50, roofShape: "triangle", roof: "#8B6B3A" },
    { color: "#B58A4C", width: 48,  height: 44, roofShape: "triangle", roof: "#8B6B3A" },
  ],
  medieval: [
    { color: "#B33D3D", width: 52,  height: 80, roofShape: "flat",     roof: "#7B2B2B", smoke: true },
    { color: "#9A3535", width: 46,  height: 70, roofShape: "flat",     roof: "#5C1F1F", smoke: true },
  ],
  modern: [
    { color: "#A0522D", width: 56,  height: 90, roofShape: "flat",     roof: "#704026" },
    { color: "#8B4513", width: 48,  height: 100, roofShape: "flat",    roof: "#5C2D0E" },
  ],
  contemporary: [
    { color: "#7FA8C9", width: 50,  height: 140, roofShape: "flat",    roof: "#5A8AAE" },
    { color: "#5E7E9A", width: 44,  height: 160, roofShape: "antenna", roof: "#3E5E7A" },
  ],
  future: [
    { color: "#E8B3FF", width: 48,  height: 130, roofShape: "dome",    roof: "#B85AFF" },
    { color: "#7FFFD4", width: 52,  height: 110, roofShape: "antenna", roof: "#40E0D0" },
    { color: "#FFD700", width: 46,  height: 150, roofShape: "dome",    roof: "#FFA500" },
  ],
};

/** 住人(NPC)のプレースホルダースタイル。era ごとに色を変える。 */
export const VILLAGER_STYLE: Record<Era, { body: string; head: string }> = {
  primitive:    { body: "#6B4226", head: "#D2A679" },
  ancient:      { body: "#8B6B3A", head: "#E0C28F" },
  medieval:     { body: "#5A4A3A", head: "#D6B98F" },
  modern:       { body: "#3B3B3B", head: "#E5C9A5" },
  contemporary: { body: "#2F4F6F", head: "#F0D6B7" },
  future:       { body: "#9A40FF", head: "#FFE0F0" },
};
