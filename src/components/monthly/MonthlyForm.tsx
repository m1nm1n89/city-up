"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordMonthlyStatsAction } from "@/app/actions/monthly";

type Stats = {
  postCount: string;
  revenueJpy: string;
  followerCount: string;
  pvCount: string;
  otherNotes: string;
};

export function MonthlyForm({
  yearMonth,
  initial,
  previous,
  currentDay,
}: {
  yearMonth: string;
  initial?: Stats | null;
  previous?: Stats | null;
  /** Day 90 以降なら入力完了後にシェアカードを自動表示 */
  currentDay: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Stats>(
    initial ?? {
      postCount: "",
      revenueJpy: "",
      followerCount: "",
      pvCount: "",
      otherNotes: "",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof Stats>(k: K, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function fillFromPrevious() {
    if (!previous) return;
    setValues(previous);
  }

  function onSubmit() {
    setError(null);
    setResultMsg(null);
    const fd = new FormData();
    fd.set("yearMonth", yearMonth);
    fd.set("postCount", values.postCount);
    fd.set("revenueJpy", values.revenueJpy);
    fd.set("followerCount", values.followerCount);
    fd.set("pvCount", values.pvCount);
    fd.set("otherNotes", values.otherNotes);
    startTransition(async () => {
      const res = await recordMonthlyStatsAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResultMsg(`記録しました。残高 ${res.data.currentCoins} コイン`);
      const autoShare = currentDay >= 90;
      const dest = autoShare
        ? `/dashboard?shareMonth=${encodeURIComponent(yearMonth)}`
        : "/dashboard";
      setTimeout(() => {
        router.push(dest);
        router.refresh();
      }, 1200);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">今月の数値を記録</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {yearMonth} の自己申告。0でもOK、書くこと自体が前進です。
        </p>
      </div>

      {previous && (
        <button
          type="button"
          onClick={fillFromPrevious}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium"
        >
          先月と同じ値を入力する
        </button>
      )}

      <div className="space-y-4">
        <Field
          label="今月の投稿数(必須)"
          required
          type="number"
          min={0}
          value={values.postCount}
          onChange={(v) => setField("postCount", v)}
          placeholder="0"
        />
        <Field
          label="今月の収益(円、必須)"
          required
          type="number"
          min={0}
          value={values.revenueJpy}
          onChange={(v) => setField("revenueJpy", v)}
          placeholder="0"
        />
        <Field
          label="フォロワー数(任意)"
          type="number"
          min={0}
          value={values.followerCount}
          onChange={(v) => setField("followerCount", v)}
        />
        <Field
          label="PV数(任意)"
          type="number"
          min={0}
          value={values.pvCount}
          onChange={(v) => setField("pvCount", v)}
        />

        <div className="space-y-1">
          <label className="text-sm font-medium">その他のメモ(任意)</label>
          <textarea
            value={values.otherNotes}
            onChange={(e) => setField("otherNotes", e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
          />
        </div>
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
        {isPending ? "保存中…" : "記録する (+5コイン)"}
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  type,
  min,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type: string;
  min?: number;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        min={min}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
      />
    </div>
  );
}
