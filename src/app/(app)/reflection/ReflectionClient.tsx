"use client";

import { useMemo, useState } from "react";
import { CityScene, SeasonSwitcher } from "@/components/city/CityScene";
import { EraSlider } from "@/components/reflection/EraSlider";
import { ProgressSlider } from "@/components/reflection/ProgressSlider";
import { ComparisonSection } from "@/components/reflection/ComparisonSection";
import { ShareCardModal } from "@/components/share/ShareCardModal";
import { ERA_UNLOCK_DAY, eraAt, type Era } from "@/lib/city/eras";
import { snapshotAtDay } from "@/lib/city/snapshot";
import type { Season } from "@/lib/city/seasons";
import type { MonthlyStatsRow } from "@/lib/reflection/compare";
import { useEffectiveDay } from "@/lib/stores/debugStore";

type Props = {
  userId: string;
  /** サーバーで計算した「今日」の Day */
  currentDay: number;
  /** Day 1 の JST 日付 (YYYY-MM-DD) */
  startedAtYmd: string;
  /** 活動済み日リスト(coins_earned > 0 の check_date 一覧) */
  activeDates: string[];
  monthlyStats: MonthlyStatsRow[];
  initialSeason: Season;
};

export function ReflectionClient(props: Props) {
  // デバッグ Day override を反映した「現在の累計日数」。
  // 進捗スライダーの最大値と過去比較の解放判定がこれに従う。
  const currentDay = useEffectiveDay(props.currentDay);

  const [selectedDay, setSelectedDay] = useState<number>(currentDay);
  const [selectedEra, setSelectedEra] = useState<Era>(eraAt(currentDay));
  const [selectedSeason, setSelectedSeason] = useState<Season>(
    props.initialSeason,
  );

  const snapshot = useMemo(
    () =>
      snapshotAtDay({
        activeDates: props.activeDates,
        startedAtYmd: props.startedAtYmd,
        day: selectedDay,
      }),
    [props.activeDates, props.startedAtYmd, selectedDay],
  );

  // 「未到達時代を選んでいる」= プレビュー透かしを出すべき条件
  const previewingUnreachedEra =
    ERA_UNLOCK_DAY[selectedEra] > currentDay;
  const isPastDay = selectedDay < currentDay;
  const overrideActive = previewingUnreachedEra || isPastDay;

  const reset = () => {
    setSelectedDay(currentDay);
    setSelectedEra(eraAt(currentDay));
  };

  return (
    <div className="space-y-5">
      <ShareCardModal />
      <section className="space-y-3">
        <div className="relative">
          <CityScene
            userId={props.userId}
            era={selectedEra}
            totalActiveDays={snapshot.totalActiveDays}
            season={selectedSeason}
          />
          {previewingUnreachedEra && (
            <div className="absolute inset-0 rounded-lg pointer-events-none">
              {/* 薄い白(ダーク時は黒)の透かし */}
              <div className="absolute inset-0 bg-white/35 dark:bg-black/35 rounded-lg" />
              <p className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/75 text-white text-[11px] px-3 py-1 backdrop-blur-sm">
                これは Day {ERA_UNLOCK_DAY[selectedEra]} で見られる景色です
              </p>
            </div>
          )}
        </div>

        {/* オーバーライド中の状態表示 */}
        {overrideActive && (
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
            {isPastDay && (
              <span>
                Day {selectedDay} の街並みを表示中
              </span>
            )}
            <button
              type="button"
              onClick={reset}
              className="underline text-gray-600 dark:text-gray-300"
            >
              今日に戻る
            </button>
          </div>
        )}

        {/* 季節ボタン(ローカル状態、永続化なし) */}
        <SeasonSwitcher current={selectedSeason} onChange={setSelectedSeason} />
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-5">
        <EraSlider
          value={selectedEra}
          onChange={setSelectedEra}
          currentDay={currentDay}
        />
        <ProgressSlider
          value={selectedDay}
          onChange={(day) => {
            setSelectedDay(day);
            // 進捗スライダーは era も連動させる(その day の到達済み era に合わせる)
            setSelectedEra(eraAt(day));
          }}
          maxDay={currentDay}
          totalActiveDaysAtValue={snapshot.totalActiveDays}
        />
      </section>

      <ComparisonSection
        currentDay={currentDay}
        startedAtYmd={props.startedAtYmd}
        activeDates={props.activeDates}
        monthlyStats={props.monthlyStats}
      />
    </div>
  );
}
