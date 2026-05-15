import { COIN_REWARDS } from "./constants";

/**
 * その日のチェック ON 数からコインを計算する純粋関数。
 * RPC 側にも同じロジックがあるが、UI の即時反映用にクライアント側でも持つ。
 * 正解はサーバー側の返り値(server reconciliation)。
 */
export function calculateDailyCoins(checkedCount: number): number {
  const count = Math.max(0, Math.min(3, checkedCount));
  const raw = count * COIN_REWARDS.perCheck +
    (count >= 3 ? COIN_REWARDS.allThreeBonus : 0);
  return Math.min(COIN_REWARDS.dailyCap, raw);
}
