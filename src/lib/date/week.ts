/**
 * city-up : 日付・週・月のヘルパー(全て Asia/Tokyo 基準)
 * - 週は ISO 8601 準拠で「月曜開始 - 日曜終了」
 * - サーバー側 RPC の today_jst / week_start_jst / year_month_jst と整合
 */

const TZ = "Asia/Tokyo";

/** 現在の JST 日付を YYYY-MM-DD で返す */
export function todayJstString(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // 'YYYY-MM-DD'
}

/** JST タイムゾーンの「今」の Date(各フィールドを JST の値で得るための一時オブジェクト) */
function nowInJst(): { year: number; month: number; day: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: wdMap[get("weekday")] ?? 0,
  };
}

/** 'YYYY-MM-DD' → Date (UTC noon にして DST/タイムゾーン跨ぎの誤差を回避) */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Date → 'YYYY-MM-DD' (UTC 基準で取り出す。parseYmd と対称) */
export function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ymd 日付を含む週(ISO: 月曜開始)の月曜の日付を 'YYYY-MM-DD' で返す */
export function weekStartOf(ymd: string): string {
  const date = parseYmd(ymd);
  // getUTCDay: 0=Sun..6=Sat. 月曜起点では (dow + 6) % 7 が「月曜から何日後か」
  const offset = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date.getTime() - offset * 86400000);
  return formatYmd(monday);
}

/** ymd 日付の前週の月曜を返す */
export function previousWeekStartOf(ymd: string): string {
  const wk = parseYmd(weekStartOf(ymd));
  return formatYmd(new Date(wk.getTime() - 7 * 86400000));
}

/** ymd 日付の翌週の月曜を返す */
export function nextWeekStartOf(ymd: string): string {
  const wk = parseYmd(weekStartOf(ymd));
  return formatYmd(new Date(wk.getTime() + 7 * 86400000));
}

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function yearMonthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

/** 'YYYY-MM' の前月 */
export function previousYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** JST タイムゾーンでの「今日」「今週」「今月」をまとめて返す */
export function getJstContext() {
  const today = todayJstString();
  const weekStart = weekStartOf(today);
  const yearMonth = yearMonthOf(today);
  const jst = nowInJst();
  return {
    today,
    weekStart,
    yearMonth,
    /** その月の日(JST) */
    dayOfMonth: jst.day,
    /** 0=Sun..6=Sat (JST) */
    weekdayJst: jst.weekday,
  };
}

/** その日が「月初の催促範囲(1〜7日)」かどうか */
export function isEarlyMonth(dayOfMonth: number): boolean {
  return dayOfMonth >= 1 && dayOfMonth <= 7;
}

/** その日が「月末の催促範囲(28日以降)」かどうか */
export function isLateMonth(dayOfMonth: number): boolean {
  return dayOfMonth >= 28;
}

/** ISO 8601 曜日: 1=Mon..7=Sun。週末判定や週初判定で使う */
export function isoDayOfWeek(weekdayJst: number): number {
  return weekdayJst === 0 ? 7 : weekdayJst;
}
