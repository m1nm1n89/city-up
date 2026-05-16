"use client";

import { useShareModalStore } from "@/lib/stores/shareModalStore";

/**
 * 共有モーダルを開くトリガーボタン。
 * モーダル本体は親ページに ShareCardModal を別途マウントしておく前提。
 */
export function ShareButton({
  day,
  label = "シェア",
  className,
}: {
  day: number;
  label?: string;
  className?: string;
}) {
  const open = useShareModalStore((s) => s.openShareModal);
  return (
    <button
      type="button"
      onClick={() => open({ day })}
      className={
        className ??
        "rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-900"
      }
      aria-label="シェアカードを作る"
    >
      {label}
    </button>
  );
}
