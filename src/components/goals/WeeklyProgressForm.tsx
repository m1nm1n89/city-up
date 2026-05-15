"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordWeeklyProgressAction } from "@/app/actions/goals";

export function WeeklyProgressForm({
  weekStart,
  goalText,
  initialProgress,
  initialAchieved,
}: {
  weekStart: string;
  goalText: string;
  initialProgress?: string | null;
  initialAchieved?: boolean;
}) {
  const router = useRouter();
  const [progressText, setProgressText] = useState(initialProgress ?? "");
  const [achieved, setAchieved] = useState<boolean>(initialAchieved ?? false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    setError(null);
    setResultMsg(null);
    const fd = new FormData();
    fd.set("weekStart", weekStart);
    fd.set("progressText", progressText);
    fd.set("achieved", achieved ? "true" : "false");
    startTransition(async () => {
      const res = await recordWeeklyProgressAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResultMsg(
        achieved
          ? `達成おめでとうございます。+${res.data.awarded} コイン`
          : "進捗を記録しました",
      );
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">今週の振り返り</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{weekStart} 開始の週</p>
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3 text-sm">
          <span className="text-gray-500 dark:text-gray-400">目標: </span>
          {goalText}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="progressText" className="text-sm font-medium">
          どこまでできた?(任意)
        </label>
        <textarea
          id="progressText"
          value={progressText}
          onChange={(e) => setProgressText(e.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
          placeholder="できたこと、できなかったこと、気づきなど"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">今週の目標は達成できた?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAchieved(true)}
            className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium ${
              achieved
                ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                : "border-gray-300 dark:border-gray-700"
            }`}
          >
            達成した (+3コイン)
          </button>
          <button
            type="button"
            onClick={() => setAchieved(false)}
            className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium ${
              !achieved
                ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                : "border-gray-300 dark:border-gray-700"
            }`}
          >
            達成できなかった
          </button>
        </div>
        <p className="text-xs text-gray-500">
          達成できなくても罰はありません。次の一歩へ。
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {resultMsg && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {resultMsg}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="w-full rounded-md bg-black text-white py-3 font-medium disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {isPending ? "保存中…" : "記録する"}
      </button>
    </div>
  );
}
