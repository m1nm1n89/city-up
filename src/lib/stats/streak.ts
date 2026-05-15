import { parseYmd, formatYmd } from "@/lib/date/week";

/**
 * 「チェックが1個以上ついている日」を活動日とみなして、
 * 累計と連続(今日 or 昨日を起点)を集計する。
 */
export type StreakInput = {
  /** YYYY-MM-DD の活動日リスト(降順でも昇順でもよい、内部で正規化する) */
  activeDates: string[];
  /** 今日(Asia/Tokyo)の YYYY-MM-DD */
  today: string;
};

export function summarizeStreak({ activeDates, today }: StreakInput) {
  const uniq = Array.from(new Set(activeDates)).sort();
  const total = uniq.length;

  if (uniq.length === 0) {
    return { total: 0, current: 0 };
  }

  const todayDate = parseYmd(today);
  const yesterday = formatYmd(new Date(todayDate.getTime() - 86400000));

  const set = new Set(uniq);
  let cursor: string;
  if (set.has(today)) {
    cursor = today;
  } else if (set.has(yesterday)) {
    cursor = yesterday;
  } else {
    return { total, current: 0 };
  }

  let current = 0;
  let date = parseYmd(cursor);
  while (set.has(formatYmd(date))) {
    current += 1;
    date = new Date(date.getTime() - 86400000);
  }
  return { total, current };
}
