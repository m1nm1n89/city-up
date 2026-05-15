import { notFound } from "next/navigation";
import { DEBUG_ENABLED } from "@/lib/debug/enabled";
import { DebugPanel } from "./DebugPanel";

/**
 * デバッグツール。
 *
 * フェーズ完了時の削除手順:
 *   1. このフォルダ src/app/(debug)/ 全体を削除
 *   2. src/lib/stores/debugStore.ts を削除
 *   3. src/lib/debug/enabled.ts を削除
 *   4. dashboard 内の DebugStrip import/利用箇所を削除
 *   5. .env.local から NEXT_PUBLIC_DEBUG_MODE 行を削除
 */
export default function DayOverridePage() {
  if (!DEBUG_ENABLED) {
    notFound();
  }
  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <DebugPanel />
    </main>
  );
}
