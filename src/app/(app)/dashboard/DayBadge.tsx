"use client";

import { useEffectiveDay } from "@/lib/stores/debugStore";

/**
 * ヘッダーに表示する「Day N」の小さなバッジ。
 * debug の overrideDay が設定されている時はそれを表示する。
 */
export function DayBadge({ serverDay }: { serverDay: number }) {
  const day = useEffectiveDay(serverDay);
  return <>Day {day}</>;
}
