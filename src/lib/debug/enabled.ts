/**
 * デバッグツール有効化ガード。
 * - NODE_ENV=development AND NEXT_PUBLIC_DEBUG_MODE=true の両方を満たす時のみ true
 * - 本番ビルドでは process.env.NODE_ENV === 'production' になり常に false
 * - tree-shake に効くよう「直接 ===」で書く
 */
export const DEBUG_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
