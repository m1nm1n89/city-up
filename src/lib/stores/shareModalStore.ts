import { create } from "zustand";

/**
 * シェアカードプレビューモーダルの状態。
 * ボタン押下 / マイルストーン提案トースト / 月次入力完了の3経路から開かれる。
 */
type ShareModalState = {
  open: boolean;
  /** カードに表示する Day。今日 or period 月末のどちらか */
  day: number;
  /** YYYY-MM 指定(その月末スナップショット)。null なら今日基準 */
  period: string | null;
  openShareModal: (opts: { day: number; period?: string | null }) => void;
  closeShareModal: () => void;
};

export const useShareModalStore = create<ShareModalState>((set) => ({
  open: false,
  day: 1,
  period: null,
  openShareModal: ({ day, period }) =>
    set({ open: true, day, period: period ?? null }),
  closeShareModal: () => set({ open: false }),
}));
