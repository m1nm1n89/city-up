"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCheckboxesAction } from "@/app/actions/checks";

export type Item = { id: string; label: string };

export function CheckboxSettings({
  initialAvailable,
  initialSelected,
}: {
  initialAvailable: Item[];
  initialSelected: string[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialAvailable);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateLabel(idx: number, label: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, label } : it)),
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  }

  function onSubmit() {
    setError(null);
    setResultMsg(null);
    if (selected.length !== 3) {
      setError("ちょうど3つ選んでください");
      return;
    }
    const allLabeled = items.every(
      (it) => it.label.trim() !== "" && it.label.length <= 100,
    );
    if (!allLabeled) {
      setError("各候補の表示名を1〜100文字で入力してください");
      return;
    }

    startTransition(async () => {
      const res = await setCheckboxesAction(items, selected);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResultMsg("保存しました");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">毎日のチェック候補</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          10候補のラベルを編集して、その中から毎日チェックする3つを選んでください。
          (選択中: <strong>{selected.length}/3</strong>)
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const isSelected = selected.includes(item.id);
          return (
            <div
              key={item.id}
              className={`flex gap-2 items-center rounded-md border p-2 ${
                isSelected
                  ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSelect(item.id)}
                className={`shrink-0 rounded-full w-7 h-7 border flex items-center justify-center text-xs font-medium ${
                  isSelected
                    ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                    : "border-gray-300 dark:border-gray-700"
                }`}
                aria-label={isSelected ? "選択解除" : "選択"}
              >
                {isSelected ? "✓" : ""}
              </button>
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                maxLength={100}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          );
        })}
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
        {isPending ? "保存中…" : "保存する"}
      </button>
    </div>
  );
}
