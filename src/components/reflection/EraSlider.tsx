"use client";

import { ERAS, ERA_LABELS, ERA_UNLOCK_DAY, type Era } from "@/lib/city/eras";

/**
 * 6時代のうちひとつを選択する離散スライダー(ボタン列で表現)。
 * 未到達時代も選択可能(プレビュー目的)。到達/未到達は補助テキストで示す。
 */
export function EraSlider({
  value,
  onChange,
  currentDay,
}: {
  value: Era;
  onChange: (e: Era) => void;
  /** 現在の累計日数。これと比べて到達/未到達を判定 */
  currentDay: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-2 text-gray-600 dark:text-gray-300">
        時代
      </label>
      <div className="grid grid-cols-6 gap-1">
        {ERAS.map((era) => {
          const unlockDay = ERA_UNLOCK_DAY[era];
          const reached = currentDay >= unlockDay;
          const active = value === era;
          return (
            <button
              key={era}
              type="button"
              onClick={() => onChange(era)}
              aria-pressed={active}
              className={`flex flex-col items-center rounded-md border px-1 py-1.5 text-xs transition ${
                active
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                  : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
              } ${!reached && !active ? "opacity-60" : ""}`}
            >
              <span className="font-semibold">{ERA_LABELS[era]}</span>
              <span className="text-[10px] mt-0.5 opacity-80">
                {reached ? `Day ${unlockDay}〜` : "未到達"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
