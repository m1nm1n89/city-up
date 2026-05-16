"use client";

import { useMemo, useState } from "react";
import {
  COMPARISON_PERIODS,
  computeComparison,
  isComparisonFeatureUnlocked,
  isPeriodAvailable,
  type ComparisonPeriod,
  type ComparisonSnapshot,
  type MonthlyStatsRow,
} from "@/lib/reflection/compare";

type Props = {
  currentDay: number;
  startedAtYmd: string;
  activeDates: string[];
  monthlyStats: MonthlyStatsRow[];
};

export function ComparisonSection(props: Props) {
  const unlocked = isComparisonFeatureUnlocked(props.currentDay);
  const [period, setPeriod] = useState<ComparisonPeriod>(30);

  // 利用可能な期間のみ選択肢に出す
  const availablePeriods = useMemo(
    () =>
      COMPARISON_PERIODS.filter((p) => isPeriodAvailable(p, props.currentDay)),
    [props.currentDay],
  );

  const comparison = useMemo(() => {
    if (!unlocked) return null;
    const effective = availablePeriods.includes(period)
      ? period
      : availablePeriods[0] ?? 30;
    return computeComparison({
      period: effective,
      currentDay: props.currentDay,
      startedAtYmd: props.startedAtYmd,
      activeDates: props.activeDates,
      monthlyStats: props.monthlyStats,
    });
  }, [
    unlocked,
    availablePeriods,
    period,
    props.currentDay,
    props.startedAtYmd,
    props.activeDates,
    props.monthlyStats,
  ]);

  if (!unlocked) {
    return (
      <section className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-5 text-center text-sm text-gray-500">
        <p className="font-semibold mb-1">過去比較</p>
        <p>Day 30 に到達すると解放されます。</p>
        <p className="text-xs mt-1">現在 Day {props.currentDay}</p>
      </section>
    );
  }

  if (!comparison) return null;

  const { past, now, daysAgo } = comparison;

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold">過去比較</h2>
        <select
          value={daysAgo}
          onChange={(e) =>
            setPeriod(Number(e.target.value) as ComparisonPeriod)
          }
          className="text-xs rounded border border-gray-300 dark:border-gray-700 px-2 py-1 bg-transparent"
          aria-label="比較期間"
        >
          {availablePeriods.map((p) => (
            <option key={p} value={p}>
              {p}日前 vs 今
            </option>
          ))}
        </select>
      </header>

      <ComparisonRow
        label="累計活動日数"
        past={past.totalActiveDays}
        now={now.totalActiveDays}
        unit="日"
      />
      <ComparisonRow
        label="累計建物数"
        past={past.buildingCount}
        now={now.buildingCount}
        unit="棟"
      />
      <ComparisonRow
        label="累計住人数"
        past={past.villagerCount}
        now={now.villagerCount}
        unit="人"
      />
      <ComparisonMonthlyRow
        label={`月次収益(${past.yearMonth} / ${now.yearMonth})`}
        past={past.revenueJpy}
        now={now.revenueJpy}
        format={(n) => `¥${n.toLocaleString()}`}
      />
      <ComparisonMonthlyRow
        label="月次投稿数"
        past={past.postCount}
        now={now.postCount}
        unit="件"
      />
      <ComparisonMonthlyRow
        label="フォロワー"
        past={past.followerCount}
        now={now.followerCount}
        unit="人"
      />
      <ComparisonMonthlyRow
        label="PV"
        past={past.pvCount}
        now={now.pvCount}
      />

      <p className="text-[10px] text-gray-400 pt-1">
        Day {past.day}({past.ymd}) → Day {now.day}({now.ymd})
      </p>
    </section>
  );
}

function ComparisonRow({
  label,
  past,
  now,
  unit,
}: {
  label: string;
  past: number;
  now: number;
  unit?: string;
}) {
  const diff = now - past;
  const u = unit ?? "";
  return (
    <div className="flex items-baseline justify-between text-sm gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium tabular-nums">
        {past}
        {u} <span className="text-gray-400 mx-1">→</span> {now}
        {u}
        <DiffBadge diff={diff} unit={u} />
      </span>
    </div>
  );
}

function ComparisonMonthlyRow({
  label,
  past,
  now,
  unit,
  format,
}: {
  label: string;
  past: number | null;
  now: number | null;
  unit?: string;
  format?: (n: number) => string;
}) {
  const fmt = (n: number | null): string => {
    if (n === null) return "—";
    if (format) return format(n);
    return `${n}${unit ?? ""}`;
  };
  const diff = past !== null && now !== null ? now - past : null;
  return (
    <div className="flex items-baseline justify-between text-sm gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium tabular-nums">
        {fmt(past)} <span className="text-gray-400 mx-1">→</span> {fmt(now)}
        {diff !== null && <DiffBadge diff={diff} unit={unit ?? ""} />}
      </span>
    </div>
  );
}

function DiffBadge({ diff, unit }: { diff: number; unit: string }) {
  if (diff === 0) return null;
  const sign = diff > 0 ? "+" : "";
  return (
    <span className="ml-2 text-xs text-gray-500">
      ({sign}
      {diff}
      {unit})
    </span>
  );
}

export type { ComparisonSnapshot };
