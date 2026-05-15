"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  code: string;
  /** リカバリー画面で表示するときは true。サインアップ後は false */
  isReset?: boolean;
};

export function RecoveryCodeDisplay({ code, isReset = false }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleDownload() {
    const blob = new Blob(
      [
        `city-up リカバリーコード\n\n`,
        `${code}\n\n`,
        `※ このコードはパスワードを忘れたときの唯一の救済手段です。\n`,
        `※ なくしたら復旧できません。安全な場所に保管してください。\n`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "city-up-recovery-code.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleProceed() {
    if (!acknowledged) return;
    router.push(isReset ? "/login" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">リカバリーコードを保管してください</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          パスワードを忘れたときの<strong>唯一の救済手段</strong>です。
          <br />
          この画面を閉じると<strong>二度と表示されません</strong>。
        </p>
      </div>

      <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
        <code className="block text-center text-2xl font-mono tracking-[0.3em] py-2 select-all">
          {code}
        </code>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 rounded-md border border-amber-400 px-3 py-2 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            {copied ? "コピーしました" : "コピー"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 rounded-md border border-amber-400 px-3 py-2 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            ダウンロード
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1"
        />
        <span>
          リカバリーコードを安全な場所に保管しました。
          紛失しても復旧できないことに同意します。
        </span>
      </label>

      <button
        type="button"
        onClick={handleProceed}
        disabled={!acknowledged}
        className="w-full rounded-md bg-black text-white py-3 font-medium disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {isReset ? "ログイン画面へ" : "ダッシュボードへ"}
      </button>
    </div>
  );
}
