/**
 * Framer Motion 用のキーフレーム/トランジションプリセット。
 */

/** 通常の建物登場(0.8秒のボイーン) */
export const BOUNCE_KEYFRAMES = {
  scale: [0, 1.5, 0.7, 1.15, 0.95, 1],
  rotate: [0, -4, 4, -2, 0],
};

export const BOUNCE_TRANSITION = {
  duration: 0.8,
  times: [0, 0.25, 0.5, 0.7, 0.85, 1],
  ease: "easeInOut" as const,
};

/** マイルストーン(派手なボイーン) */
export const MILESTONE_BOUNCE_KEYFRAMES = {
  scale: [0, 1.8, 0.6, 1.3, 0.9, 1.05, 1],
};
export const MILESTONE_BOUNCE_TRANSITION = {
  duration: 1.6,
  times: [0, 0.2, 0.4, 0.55, 0.75, 0.9, 1],
  ease: "easeInOut" as const,
};

/** フラッシュ */
export const FLASH_KEYFRAMES = {
  opacity: [0, 0.95, 0],
};
export const FLASH_TRANSITION = { duration: 0.6, ease: "easeOut" as const };

export const FLASH_LONG_TRANSITION = { duration: 2.0, ease: "easeOut" as const };

/** 住人の出現(ぽん) */
export const VILLAGER_POP = {
  scale: [0, 1.3, 1],
};
export const VILLAGER_POP_TRANSITION = {
  duration: 0.6,
  times: [0, 0.6, 1],
  ease: "easeOut" as const,
};
