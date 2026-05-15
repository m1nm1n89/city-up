"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Season } from "@/lib/city/seasons";
import type { MilestoneDay } from "@/lib/city/eras";
import { DEBUG_ENABLED } from "@/lib/debug/enabled";

/**
 * デバッグ用クライアント状態。
 *
 * 重要: ここで持つ値は DB に書き込まれない。
 * UI 表示の計算で、サーバーから来た値の代わりに使うだけ。
 * 本番(NODE_ENV=production)では DEBUG_ENABLED=false になり、
 * ストアの値はあっても useEffectiveDay 等の selector が常に元の値を返す。
 */
type DebugState = {
  /** Day を上書き(null = 上書きしない) */
  overrideDay: number | null;
  /** Season を上書き(null = 上書きしない) */
  overrideSeason: Season | null;
  /** 強制発火する milestone 演出(1回再生して null に戻る) */
  forcedMilestone: MilestoneDay | null;

  setOverrideDay: (d: number | null) => void;
  setOverrideSeason: (s: Season | null) => void;
  fireMilestone: (d: MilestoneDay) => void;
  consumeForcedMilestone: () => MilestoneDay | null;
  reset: () => void;
};

export const useDebugStore = create<DebugState>()(
  persist(
    (set, get) => ({
      overrideDay: null,
      overrideSeason: null,
      forcedMilestone: null,

      setOverrideDay: (d) => set({ overrideDay: d }),
      setOverrideSeason: (s) => set({ overrideSeason: s }),
      fireMilestone: (d) => set({ forcedMilestone: d }),
      consumeForcedMilestone: () => {
        const v = get().forcedMilestone;
        if (v != null) set({ forcedMilestone: null });
        return v;
      },
      reset: () =>
        set({ overrideDay: null, overrideSeason: null, forcedMilestone: null }),
    }),
    {
      name: "city-up-debug",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** 本番では常にサーバー値を返す。デバッグ時のみオーバーライドを返す。 */
export function useEffectiveDay(serverDay: number): number {
  const override = useDebugStore((s) => s.overrideDay);
  if (DEBUG_ENABLED && override != null) return override;
  return serverDay;
}

export function useEffectiveSeason<T extends Season>(serverSeason: T): T | Season {
  const override = useDebugStore((s) => s.overrideSeason);
  if (DEBUG_ENABLED && override != null) return override;
  return serverSeason;
}

/**
 * 累計活動日数。debug で Day を上書きしている時は、それを活動日数としても扱う。
 * (debug 中は「Day 200 の街並み」が見たいので、建物計算もそちらに引きずる)
 */
export function useEffectiveTotalActiveDays(serverTotal: number): number {
  const overrideDay = useDebugStore((s) => s.overrideDay);
  if (DEBUG_ENABLED && overrideDay != null) {
    return Math.max(serverTotal, overrideDay);
  }
  return serverTotal;
}
