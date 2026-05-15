"use client";

import { useState, useTransition } from "react";
import { setWeeklyGoalAction } from "@/app/actions/goals";

type Mode = "templateA" | "templateB" | "free";

export function WeeklyGoalForm({
  weekStart,
  initialGoal,
}: {
  weekStart: string;
  initialGoal?: string | null;
}) {
  const [mode, setMode] = useState<Mode>(initialGoal ? "free" : "templateA");
  const [count, setCount] = useState("");
  const [freeText, setFreeText] = useState(initialGoal ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildGoalText(): string {
    if (mode === "templateA") {
      const n = Number(count);
      if (!Number.isFinite(n) || n <= 0) return "";
      return `noteを${n}回投稿する`;
    }
    if (mode === "templateB") {
      return "Xに毎日ポストする";
    }
    return freeText.trim();
  }

  function onSubmit() {
    setError(null);
    const goalText = buildGoalText();
    if (!goalText) {
      setError("内容を入力してください");
      return;
    }
    const fd = new FormData();
    fd.set("weekStart", weekStart);
    fd.set("goalText", goalText);
    startTransition(async () => {
      const res = await setWeeklyGoalAction(fd);
      if (res && !res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">今週の目標</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          小さな一歩を一つ決めましょう({weekStart} 開始の週)
        </p>
      </div>

      <div className="space-y-3">
        <Option
          label="noteの投稿回数を決める"
          active={mode === "templateA"}
          onClick={() => setMode("templateA")}
        >
          <div className="flex items-center gap-2">
            <span>noteを</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onFocus={() => setMode("templateA")}
              className="w-20 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5"
              placeholder="1"
            />
            <span>回投稿する</span>
          </div>
        </Option>

        <Option
          label="Xに毎日ポストする"
          active={mode === "templateB"}
          onClick={() => setMode("templateB")}
        >
          <p className="text-sm text-gray-500">短くてもOK、続けることが目的。</p>
        </Option>

        <Option
          label="自由に書く"
          active={mode === "free"}
          onClick={() => setMode("free")}
        >
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onFocus={() => setMode("free")}
            maxLength={500}
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
            placeholder="例: 競合の note を 5 本読む"
          />
        </Option>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="w-full rounded-md bg-black text-white py-3 font-medium disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {isPending ? "保存中…" : "決定する"}
      </button>
    </div>
  );
}

function Option({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md border p-4 cursor-pointer transition ${
        active
          ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
          : "border-gray-200 dark:border-gray-800"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          type="radio"
          checked={active}
          onChange={onClick}
          className="cursor-pointer"
        />
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}
