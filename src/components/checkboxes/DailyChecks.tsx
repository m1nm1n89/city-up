"use client";

import { useState, useTransition } from "react";
import { recordDailyChecksAction } from "@/app/actions/checks";

type Item = { id: string; label: string };

export function DailyChecks({
  items,
  initialChecks,
  initialDayCoins,
  onUpdate,
}: {
  items: Item[];
  initialChecks: Record<string, boolean>;
  initialDayCoins: number;
  onUpdate?: (newCurrentCoins: number, dayCoins: number) => void;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(initialChecks);
  const [dayCoins, setDayCoins] = useState<number>(initialDayCoins);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    setError(null);

    startTransition(async () => {
      const res = await recordDailyChecksAction(next);
      if (!res.ok) {
        // 失敗したらロールバック
        setChecks(checks);
        setError(res.error);
        return;
      }
      setDayCoins(res.data.dayCoins);
      onUpdate?.(res.data.currentCoins, res.data.dayCoins);
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">今日のチェック</h2>
        <span className="text-xs text-gray-500">
          今日のコイン: <strong>{dayCoins}</strong> / 4
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const on = !!checks[item.id];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={`w-full flex items-center gap-3 rounded-md border px-3 py-3 text-left text-sm transition ${
                  on
                    ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <span
                  className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium ${
                    on
                      ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
