/**
 * 過去比較のための純粋関数群。
 * 入力(activeDates / monthlyStats)はサーバー Component が認証済み Supabase クライアントから
 * 取得した「自分のデータ」のみ。RLS により他人のデータは混入しない。
 */

import { buildingCountForActivity, villagerCountForBuildings } from "@/lib/city/layout";
import { ymdForDay, totalActiveDaysUpTo } from "@/lib/city/snapshot";
import { yearMonthOf } from "@/lib/date/week";

const VILLAGER_CAP = 20;

export const COMPARISON_PERIODS = [30, 90, 180, 365] as const;
export type ComparisonPeriod = (typeof COMPARISON_PERIODS)[number];

export type MonthlyStatsRow = {
  year_month: string;
  post_count: number;
  revenue_jpy: number;
  follower_count: number | null;
  pv_count: number | null;
};

export type ComparisonSnapshot = {
  day: number;
  ymd: string;
  yearMonth: string;
  totalActiveDays: number;
  buildingCount: number;
  villagerCount: number;
  postCount: number | null;
  revenueJpy: number | null;
  followerCount: number | null;
  pvCount: number | null;
};

export type Comparison = {
  past: ComparisonSnapshot;
  now: ComparisonSnapshot;
  daysAgo: ComparisonPeriod;
};

export function isPeriodAvailable(
  period: ComparisonPeriod,
  currentDay: number,
): boolean {
  return currentDay >= period;
}

export function isComparisonFeatureUnlocked(currentDay: number): boolean {
  return currentDay >= 30;
}

function buildSnapshot(opts: {
  day: number;
  startedAtYmd: string;
  activeDates: string[];
  monthlyByYm: Map<string, MonthlyStatsRow>;
}): ComparisonSnapshot {
  const ymd = ymdForDay({ startedAtYmd: opts.startedAtYmd, day: opts.day });
  const ym = yearMonthOf(ymd);
  const m = opts.monthlyByYm.get(ym);
  const totalActiveDays = totalActiveDaysUpTo({
    activeDates: opts.activeDates,
    upToYmd: ymd,
  });
  const buildingCount = buildingCountForActivity(totalActiveDays);
  return {
    day: opts.day,
    ymd,
    yearMonth: ym,
    totalActiveDays,
    buildingCount,
    villagerCount: villagerCountForBuildings(buildingCount, VILLAGER_CAP),
    postCount: m?.post_count ?? null,
    revenueJpy: m?.revenue_jpy ?? null,
    followerCount: m?.follower_count ?? null,
    pvCount: m?.pv_count ?? null,
  };
}

export function computeComparison(opts: {
  period: ComparisonPeriod;
  currentDay: number;
  startedAtYmd: string;
  activeDates: string[];
  monthlyStats: MonthlyStatsRow[];
}): Comparison {
  const byYm = new Map<string, MonthlyStatsRow>(
    opts.monthlyStats.map((m) => [m.year_month, m]),
  );
  const pastDay = Math.max(1, opts.currentDay - opts.period);
  const past = buildSnapshot({
    day: pastDay,
    startedAtYmd: opts.startedAtYmd,
    activeDates: opts.activeDates,
    monthlyByYm: byYm,
  });
  const now = buildSnapshot({
    day: opts.currentDay,
    startedAtYmd: opts.startedAtYmd,
    activeDates: opts.activeDates,
    monthlyByYm: byYm,
  });
  return { past, now, daysAgo: opts.period };
}
