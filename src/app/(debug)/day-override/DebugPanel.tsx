"use client";

import Link from "next/link";
import { useDebugStore } from "@/lib/stores/debugStore";
import {
  ALL_MILESTONE_DAYS,
  ERAS,
  ERA_LABELS,
  ERA_UNLOCK_DAY,
  eraAt,
  type Era,
  type MilestoneDay,
} from "@/lib/city/eras";
import { SEASONS, type Season, SEASON_LABELS } from "@/lib/city/seasons";

export function DebugPanel() {
  const {
    overrideDay,
    overrideSeason,
    setOverrideDay,
    setOverrideSeason,
    fireMilestone,
    reset,
  } = useDebugStore();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Debug · Day Override</h1>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          このページは development + NEXT_PUBLIC_DEBUG_MODE=true の時のみ動きます。
          DB は一切書き換えません(クライアントの localStorage のみ)。
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold">Day を強制</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={overrideDay ?? ""}
            placeholder="サーバー値を使用"
            onChange={(e) => {
              const v = e.target.value;
              setOverrideDay(v === "" ? null : Math.max(1, Number(v)));
            }}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 w-32"
          />
          <button
            type="button"
            onClick={() => setOverrideDay(null)}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            解除
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 7, 15, 30, 60, 90, 150, 180, 270, 365, 400].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setOverrideDay(d)}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs"
            >
              Day {d}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">時代を強制(対応する Day を上書き)</h2>
        <p className="text-xs text-gray-500">
          一画面=一時代の街並み。era を切り替えると街並み全体がフェードして差し替わります。
        </p>
        <div className="flex flex-wrap gap-2">
          {ERAS.map((e: Era) => {
            const repDay = ERA_UNLOCK_DAY[e];
            const currentEra =
              overrideDay != null ? eraAt(overrideDay) : null;
            return (
              <button
                key={e}
                type="button"
                onClick={() => setOverrideDay(repDay)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  currentEra === e
                    ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                    : "border-gray-300 dark:border-gray-700"
                }`}
              >
                {ERA_LABELS[e]}
                <span className="ml-1 text-xs text-gray-500">
                  (Day {repDay})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">マイルストーン演出を強制発火</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_MILESTONE_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => fireMilestone(d as MilestoneDay)}
              className="rounded-md border border-amber-400 px-3 py-2 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              Day {d} 演出
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          ダッシュボードに戻ると、即座に演出が再生されます。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">季節を強制</h2>
        <div className="flex gap-2">
          {SEASONS.map((s: Season) => (
            <button
              key={s}
              type="button"
              onClick={() => setOverrideSeason(s)}
              className={`rounded-md border px-3 py-2 text-sm ${
                overrideSeason === s
                  ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              {SEASON_LABELS[s]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOverrideSeason(null)}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            解除
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">リセット</h2>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-black text-white px-4 py-2 text-sm dark:bg-white dark:text-black"
        >
          全オーバーライドを解除
        </button>
      </section>

      <Link href="/dashboard" className="inline-block underline text-sm">
        ダッシュボードへ戻る
      </Link>
    </div>
  );
}
