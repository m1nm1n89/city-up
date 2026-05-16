"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MilestoneDay } from "@/lib/city/eras";

/**
 * マイルストーン到達直後の「シェアカード作りますか?」提案トースト。
 *
 * 設計指針(押し付けない):
 *   - 「作る」をプライマリにしない(2つのボタンを視覚的に等価扱い)
 *   - 強い色・点滅なし
 *   - 10秒で勝手にフェードアウト
 *   - 一度閉じたら、同セッション内では再表示しない(親側で管理)
 */
export function MilestoneToast({
  day,
  onShare,
  onDismiss,
}: {
  /** 表示中のマイルストーン Day(null なら非表示) */
  day: MilestoneDay | null;
  onShare: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (day == null) return;
    const t = setTimeout(onDismiss, 10000);
    return () => clearTimeout(t);
  }, [day, onDismiss]);

  return (
    <AnimatePresence>
      {day != null && (
        <motion.div
          key={day}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-2rem)]"
        >
          <div
            role="status"
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl p-3 flex items-center gap-3"
          >
            <div
              aria-hidden
              className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm"
            >
              ◇
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium">Day {day} を迎えました。</p>
              <p className="text-gray-500 text-xs mt-0.5">
                シェアカードを作りますか?
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-md border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs"
              >
                あとで
              </button>
              <button
                type="button"
                onClick={onShare}
                className="rounded-md border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs"
              >
                作る
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
