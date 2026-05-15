import { parseYmd, formatYmd } from "@/lib/date/week";
import { eraAt, type Era } from "./eras";

/**
 * profiles.started_at と「今日(JST)」から経過日数を計算。
 * Day 1 = started_at 当日。
 * 純粋関数。サーバー側で必ず実行(クライアントの偽装を信用しない)。
 */
export function computeDay(opts: {
  startedAtIso: string;
  todayJst: string;
}): number {
  const start = new Date(opts.startedAtIso);
  const startYmd = formatYmd(
    new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        12,
      ),
    ),
  );
  const startUtc = parseYmd(startYmd);
  const todayUtc = parseYmd(opts.todayJst);
  const diff = Math.floor((todayUtc.getTime() - startUtc.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

/**
 * 現在 DB に記録されている era と、サーバー計算による「達成済み era」が
 * ズレている場合は新しい era を返す(クライアントから set_current_era を呼ぶ用)。
 */
export function eraIfShouldUpdate(opts: {
  day: number;
  currentEra: Era;
}): Era | null {
  const target = eraAt(opts.day);
  return target !== opts.currentEra ? target : null;
}
