"use client";

import { useState, useTransition } from "react";
import { setFinalGoalAction } from "@/app/actions/goals";

type Mode = "templateA" | "templateB" | "free";

export function FinalGoalForm({ initialGoal }: { initialGoal?: string | null }) {
  const [mode, setMode] = useState<Mode>("templateA");
  const [amount, setAmount] = useState("");
  const [followers, setFollowers] = useState("");
  const [freeText, setFreeText] = useState(initialGoal ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildGoalText(): string {
    if (mode === "templateA") {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) return "";
      return `月${n.toLocaleString()}円の収益を出す`;
    }
    if (mode === "templateB") {
      const n = Number(followers);
      if (!Number.isFinite(n) || n <= 0) return "";
      return `フォロワー${n.toLocaleString()}人を達成する`;
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
    fd.set("finalGoal", goalText);
    startTransition(async () => {
      const res = await setFinalGoalAction(fd);
      if (res && !res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">最終目標を決めよう</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          数字が動かない時期も、最終目標を見失わないように。
          後から変更もできます。
        </p>
      </div>

      <div className="space-y-3">
        <ModeOption
          label="月の収益目標を立てる"
          active={mode === "templateA"}
          onClick={() => setMode("templateA")}
        >
          <div className="flex items-center gap-2">
            <span>月</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={() => setMode("templateA")}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5"
              placeholder="50000"
            />
            <span>円の収益を出す</span>
          </div>
        </ModeOption>

        <ModeOption
          label="フォロワー目標を立てる"
          active={mode === "templateB"}
          onClick={() => setMode("templateB")}
        >
          <div className="flex items-center gap-2">
            <span>フォロワー</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              onFocus={() => setMode("templateB")}
              className="w-32 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5"
              placeholder="1000"
            />
            <span>人を達成する</span>
          </div>
        </ModeOption>

        <ModeOption
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
            placeholder="例: noteで月10万PVを達成する"
          />
        </ModeOption>
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
        {isPending ? "保存中…" : "この目標で始める"}
      </button>
    </div>
  );
}

function ModeOption({
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
