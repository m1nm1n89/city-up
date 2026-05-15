"use client";

import { AnimatePresence } from "framer-motion";
import { useMentorStore } from "@/lib/stores/mentorStore";
import { MessageBubble } from "./MessageBubble";

export function MentorPanel() {
  const current = useMentorStore((s) => s.current);
  const dismiss = useMentorStore((s) => s.dismiss);

  return (
    <div className="flex items-end gap-3">
      {/* 顔アイコン(プレースホルダー) */}
      <div
        aria-hidden
        className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-rose-700 font-bold border border-rose-200 shadow-sm"
      >
        M
      </div>

      {/* セリフ枠 */}
      <div className="flex-1 min-h-[44px] flex items-center">
        <AnimatePresence mode="wait">
          {current ? (
            <MessageBubble
              key={current.id}
              text={current.text}
              onDismiss={dismiss}
            />
          ) : (
            <div
              key="placeholder"
              className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-2 text-xs text-gray-400"
            >
              街の様子を眺めています…
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
