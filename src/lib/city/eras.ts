export type Era =
  | "primitive"
  | "ancient"
  | "medieval"
  | "modern"
  | "contemporary"
  | "future";

export const ERAS: readonly Era[] = [
  "primitive",
  "ancient",
  "medieval",
  "modern",
  "contemporary",
  "future",
];

export const ERA_LABELS: Record<Era, string> = {
  primitive:    "原始",
  ancient:      "古代",
  medieval:     "中世",
  modern:       "近代",
  contemporary: "現代",
  future:       "未来",
};

/** マイルストーン到達日数(Day 1 = started_at 当日) */
export const ERA_UNLOCK_DAY: Record<Era, number> = {
  primitive:    1,
  ancient:      30,
  medieval:     90,
  modern:       180,
  contemporary: 270,
  future:       365,
};

/** 全マイルストーン Day。住人解放(Day 7)も含めて演出用に。 */
export const ALL_MILESTONE_DAYS = [1, 7, 30, 90, 180, 270, 365] as const;
export type MilestoneDay = (typeof ALL_MILESTONE_DAYS)[number];

/**
 * day(>=1) から到達中の最新の era を返す。
 * 純粋関数。サーバー/クライアント両方で使う。
 */
export function eraAt(day: number): Era {
  if (day >= ERA_UNLOCK_DAY.future)        return "future";
  if (day >= ERA_UNLOCK_DAY.contemporary)  return "contemporary";
  if (day >= ERA_UNLOCK_DAY.modern)        return "modern";
  if (day >= ERA_UNLOCK_DAY.medieval)      return "medieval";
  if (day >= ERA_UNLOCK_DAY.ancient)       return "ancient";
  return "primitive";
}

/** 解放済みの era 一覧(古い順) */
export function unlockedEras(day: number): Era[] {
  return ERAS.filter((e) => day >= ERA_UNLOCK_DAY[e]);
}

/** 与えた day が「ちょうど到達した」マイルストーン日かどうか */
export function isMilestoneDay(day: number): day is MilestoneDay {
  return (ALL_MILESTONE_DAYS as readonly number[]).includes(day);
}

/** Era の順位(0 = primitive, 5 = future) */
export function eraRank(e: Era): number {
  return ERAS.indexOf(e);
}
