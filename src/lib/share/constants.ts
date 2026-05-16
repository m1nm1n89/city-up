/**
 * シェアカード関連の定数。
 * Cloudflare Workers の OG/Satori 互換ランタイムでも使えるよう、import は副作用フリーに保つ。
 */

export const SHARE_CARD_SIZES = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
} as const;

export type ShareCardSize = keyof typeof SHARE_CARD_SIZES;

/** アプリの公開 URL(本番ドメイン取得後に env で上書き可能) */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
  "https://cityup.example.com";

/** 表示用ホスト名(プロトコル無し) */
export function appHostLabel(): string {
  try {
    return new URL(APP_URL).host;
  } catch {
    return "cityup.example.com";
  }
}

/** X 共有のデフォルト文言。`{day}` を Day 数で置換する */
export const DEFAULT_SHARE_TEXT = "Day {day}、街がここまで育ちました。";

export function buildShareText(day: number): string {
  return DEFAULT_SHARE_TEXT.replace("{day}", String(day));
}

/** YYYY-MM 表記から Month 番号を求める(Day 30 = Month 1 の素朴な定義) */
export function monthLabelFromDay(day: number): number {
  return Math.max(1, Math.ceil(day / 30));
}
