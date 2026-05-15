/**
 * 街並み配置のための再現性ある疑似乱数。
 * 同じ userId + 同じ count なら毎回同じレイアウトになる。
 * era は seed に含めないので、時代が変わっても建物の **位置** は同じ。
 * (景色が「同じ場所で違う時代の建物に置き換わる」見え方になる)
 *
 * 振り返り画面など別 era での再描画は、placeBuildings に era だけ差し替えて
 * 呼べばよい。
 *
 * mulberry32 (Tommy Ettinger 改作、public domain)
 */

import { BUILDING_STYLE } from "./assets";
import type { Era } from "./eras";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 文字列を 32bit 整数にハッシュ(FNV-1a) */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type BuildingPlacement = {
  /** stable id(再描画キー)。era 込みにすることで era 変更時に React の差分で再 mount される */
  id: string;
  era: Era;
  /** 0..1 の x 座標(街並み幅に対する比率) */
  xRatio: number;
  /** どの建物バリエーションを使うか */
  variant: number;
};

export type VillagerPlacement = {
  id: string;
  era: Era;
  /** 初期位置 0..1 */
  xRatio: number;
  /** 歩行速度 (px/frame、絶対値) */
  speed: number;
  /** 進行方向: 1 or -1 */
  dir: 1 | -1;
};

/**
 * 累計チェック数から建物数を決める。緩やかに増えるよう設計。
 * Day 1=1, Day 10=2, Day 30=4, Day 100=8, Day 200 以降は上限の 9 で頭打ち。
 * 視覚的にギチギチにならないよう、最大は街並みエリアに対して控えめ。
 */
export function buildingCountForActivity(activeDays: number): number {
  if (activeDays <= 0) return 0;
  return Math.max(1, Math.min(9, Math.floor(Math.sqrt(activeDays) * 0.85)));
}

/** 建物 1 棟あたり平均 1.2 人。最大は呼び出し側でクリップ */
export function villagerCountForBuildings(buildings: number, cap: number): number {
  return Math.min(cap, Math.max(0, Math.floor(buildings * 1.2)));
}

/**
 * 街並みの建物配置。すべて同じ era で揃える(街は一時代のもの)。
 *
 * @param opts.userId  シードに使うユーザー識別子(再現性のため)
 * @param opts.era     描画する時代。これがそのまますべての建物に割り当てられる
 * @param opts.count   建物の総数
 *
 * 将来の振り返り画面では、現在の era ではなく任意の era を渡すことで
 * 「Day 30 時点の街(古代)」のような過去の見た目を再現できる。
 */
export function placeBuildings(opts: {
  userId: string;
  era: Era;
  count: number;
}): BuildingPlacement[] {
  const { userId, era, count } = opts;
  if (count <= 0) return [];
  const rand = mulberry32(hashSeed(`${userId}:buildings`));
  const variants = BUILDING_STYLE[era].length;

  const result: BuildingPlacement[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `b-${era}-${i}`, // era 込み: 時代が変われば key が変わって AnimatePresence で exit/enter
      era,
      xRatio: (i + 0.5 + (rand() - 0.5) * 0.4) / count,
      variant: Math.floor(rand() * variants),
    });
  }
  return result;
}

/** 住人の配置。era は見た目の色に使うだけで、配置は count に依存しない再現乱数。 */
export function placeVillagers(opts: {
  userId: string;
  era: Era;
  count: number;
}): VillagerPlacement[] {
  const { userId, era, count } = opts;
  if (count <= 0) return [];
  const rand = mulberry32(hashSeed(`${userId}:villagers`));

  const result: VillagerPlacement[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `v-${i}`,
      era,
      xRatio: rand(),
      speed: 0.4 + rand() * 0.8,
      dir: rand() > 0.5 ? 1 : -1,
    });
  }
  return result;
}
