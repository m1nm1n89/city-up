"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CityScene } from "@/components/city/CityScene";
import { MilestoneOverlay } from "@/components/city/MilestoneOverlay";
import { MentorPanel } from "@/components/mentor/MentorPanel";
import { DailyChecks } from "@/components/checkboxes/DailyChecks";
import { useMentorStore } from "@/lib/stores/mentorStore";
import {
  useDebugStore,
  useEffectiveDay,
  useEffectiveTotalActiveDays,
} from "@/lib/stores/debugStore";
import { DEBUG_ENABLED } from "@/lib/debug/enabled";
import {
  ALL_MILESTONE_DAYS,
  eraAt,
  isMilestoneDay,
  type MilestoneDay,
} from "@/lib/city/eras";
import type { Season } from "@/lib/city/seasons";
import type { MentorTrigger } from "@/lib/mentor/messages";
import type { Checkbox } from "@/types/db";

type Props = {
  userId: string;
  serverDay: number;
  serverSeason: Season;
  totalActiveDays: number;
  lastActiveDate: string | null;
  todayJst: string;
  /** ダッシュボード初回マウント時に発火する trigger 候補 */
  initialTrigger: MentorTrigger;
  /** 今日のチェック関連 */
  selectedItems: Checkbox[];
  initialChecks: Record<string, boolean>;
  initialDayCoins: number;
};

export function DashboardClient(props: Props) {
  const day = useEffectiveDay(props.serverDay);
  const totalActiveDays = useEffectiveTotalActiveDays(props.totalActiveDays);
  const [newlyBuiltIndex, setNewlyBuiltIndex] = useState<number | null>(null);
  const [newlyArrivedVillager, setNewlyArrivedVillager] = useState<number | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneDay | null>(null);
  const fire = useMentorStore((s) => s.fire);
  const consumeForced = useDebugStore((s) => s.consumeForcedMilestone);

  // 初回マウント: ようこそ / おかえり 系の挨拶
  useEffect(() => {
    fire(props.initialTrigger);
  }, [fire, props.initialTrigger]);

  // debug ストアの強制マイルストーン演出
  useEffect(() => {
    const m = consumeForced();
    if (m != null) {
      setActiveMilestone(m);
    }
  }, [consumeForced]);

  // 自然到達: 通常 Day と一致する milestone があれば演出
  // (デバッグで day を変えたときも反映される)
  const [lastShownDay, setLastShownDay] = useState<number | null>(null);
  useEffect(() => {
    if (isMilestoneDay(day) && lastShownDay !== day) {
      setActiveMilestone(day);
      setLastShownDay(day);
    }
  }, [day, lastShownDay]);

  function onChecksUpdate(_currentCoins: number, dayCoins: number) {
    // チェック ON のたびに建物が建つ風の演出: 最新の建物 index にボイーン
    // 実際には buildingCountForActivity と totalActiveDays から index を計算するのが正確だが、
    // ここではダッシュボード再フェッチに任せ、UI ヒントだけ提供
    if (dayCoins === 1) fire("check_one_done");
    if (dayCoins >= 4) fire("check_all_done");
    // 直前の建物にボイーン(暫定: 最後の建物)
    setNewlyBuiltIndex(props.totalActiveDays); // not strictly correct, but visually triggers
    setTimeout(() => setNewlyBuiltIndex(null), 900);
  }

  // Day 7 を初めて迎えた時、住人ぽん演出のフラグ(暫定で debug のみ用途)
  useEffect(() => {
    if (activeMilestone === 7) {
      setNewlyArrivedVillager(0);
      const t = setTimeout(() => setNewlyArrivedVillager(null), 1000);
      return () => clearTimeout(t);
    }
  }, [activeMilestone]);

  const milestoneList = useMemo(() => ALL_MILESTONE_DAYS, []);

  return (
    <>
      <MilestoneOverlay activeDay={activeMilestone} />

      <CityScene
        userId={props.userId}
        era={eraAt(day)}
        totalActiveDays={totalActiveDays}
        initialSeason={props.serverSeason}
        newlyBuiltIndex={newlyBuiltIndex}
        newlyArrivedVillager={newlyArrivedVillager}
      />

      <div className="mt-4">
        <MentorPanel />
      </div>

      <div className="mt-4">
        {props.selectedItems.length === 3 ? (
          <DailyChecks
            items={props.selectedItems}
            initialChecks={props.initialChecks}
            initialDayCoins={props.initialDayCoins}
            onUpdate={onChecksUpdate}
          />
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm">
            チェック候補の設定が必要です。
            <Link href="/settings/checkboxes" className="ml-2 underline font-medium">
              設定する
            </Link>
          </div>
        )}
      </div>

      {DEBUG_ENABLED && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs flex flex-wrap items-center gap-2">
          <span className="font-semibold">DEBUG</span>
          <span>Day {day}</span>
          {milestoneList.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setActiveMilestone(d)}
              className="rounded border border-amber-400 px-2 py-0.5"
            >
              Day {d} 演出
            </button>
          ))}
          <Link href="/day-override" className="ml-auto underline">
            詳細パネル
          </Link>
        </div>
      )}
    </>
  );
}
