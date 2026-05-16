/**
 * 振り返り画面用: 任意の Day における街並みスナップショットを計算する純粋関数群。
 * すべてサーバー/クライアント両方で同じ結果を返す(集計はサーバー側で済ませる前提)。
 */

import { parseYmd, formatYmd } from "@/lib/date/week";
import { eraAt, type Era } from "./eras";
import { buildingCountForActivity } from "./layout";

/**
 * started_at(ISO 文字列)を「Day 1 の日付」として YYYY-MM-DD に変換する。
 * computeDay() と同じ UTC ベースの解釈を採用して整合性を保つ。
 */
export function startedAtToYmd(startedAtIso: string): string {
  const d = new Date(startedAtIso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Day 1 = startedAt の日。Day N の日付を YYYY-MM-DD で返す */
export function ymdForDay(opts: {
  startedAtYmd: string;
  day: number;
}): string {
  const start = parseYmd(opts.startedAtYmd);
  const target = new Date(start.getTime() + (opts.day - 1) * 86400000);
  return formatYmd(target);
}

/** activeDates のうち、target day の日付以下のもの数を返す */
export function totalActiveDaysUpTo(opts: {
  activeDates: string[];
  upToYmd: string;
}): number {
  return opts.activeDates.filter((d) => d <= opts.upToYmd).length;
}

export type CitySnapshot = {
  /** 1-based day */
  day: number;
  era: Era;
  totalActiveDays: number;
  buildingCount: number;
  /** その day の JST 日付 (YYYY-MM-DD) */
  ymd: string;
};

/**
 * Day N の街並みスナップショットを構築する純粋関数。
 * 過去日数の集計はクライアント側でも安全(他人のデータは fetch しない構成のため)。
 */
export function snapshotAtDay(opts: {
  activeDates: string[];
  startedAtYmd: string;
  day: number;
}): CitySnapshot {
  const ymd = ymdForDay({ startedAtYmd: opts.startedAtYmd, day: opts.day });
  const totalActiveDays = totalActiveDaysUpTo({
    activeDates: opts.activeDates,
    upToYmd: ymd,
  });
  return {
    day: opts.day,
    era: eraAt(opts.day),
    totalActiveDays,
    buildingCount: buildingCountForActivity(totalActiveDays),
    ymd,
  };
}
