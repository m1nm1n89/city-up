import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DailyChecks } from "@/components/checkboxes/DailyChecks";
import { ReminderBanner } from "@/components/banners/ReminderBanner";
import { MonthlyOverdueModal } from "@/components/banners/MonthlyOverdueModal";
import {
  getJstContext,
  isEarlyMonth,
  isLateMonth,
  isoDayOfWeek,
  previousYearMonth,
  previousWeekStartOf,
} from "@/lib/date/week";
import { summarizeStreak } from "@/lib/stats/streak";
import type { Checkbox } from "@/types/db";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // プロフィール + 設定
  const [{ data: profile }, { data: settings }, { data: balance }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, started_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_settings")
      .select("final_goal, selected_checkboxes, available_checkboxes")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("coin_balance")
      .select("current_coins")
      .eq("user_id", user.id)
      .single(),
  ]);

  // 最終目標が未設定なら onboarding へ
  if (!settings?.final_goal || !settings.final_goal.trim()) {
    redirect("/onboarding");
  }

  const ctx = getJstContext();

  const [
    { data: todayChecks },
    { data: weeklyGoal },
    { data: lastWeeklyGoal },
    { data: monthThis },
    { data: monthPrev },
    { data: activeDays },
  ] = await Promise.all([
    supabase
      .from("daily_checks")
      .select("checks, coins_earned")
      .eq("user_id", user.id)
      .eq("check_date", ctx.today)
      .maybeSingle(),
    supabase
      .from("weekly_goals")
      .select("goal_text")
      .eq("user_id", user.id)
      .eq("week_start_date", ctx.weekStart)
      .maybeSingle(),
    supabase
      .from("weekly_goals")
      .select("goal_text, progress_text, achieved")
      .eq("user_id", user.id)
      .eq("week_start_date", previousWeekStartOf(ctx.today))
      .maybeSingle(),
    supabase
      .from("monthly_stats")
      .select("post_count, revenue_jpy")
      .eq("user_id", user.id)
      .eq("year_month", ctx.yearMonth)
      .maybeSingle(),
    supabase
      .from("monthly_stats")
      .select("id")
      .eq("user_id", user.id)
      .eq("year_month", previousYearMonth(ctx.yearMonth))
      .maybeSingle(),
    supabase
      .from("daily_checks")
      .select("check_date")
      .eq("user_id", user.id)
      .gt("coins_earned", 0)
      .order("check_date", { ascending: false })
      .limit(400),
  ]);

  const available: Checkbox[] = (settings.available_checkboxes ?? []) as Checkbox[];
  const selected: string[] = (settings.selected_checkboxes ?? []) as string[];
  const selectedItems: Checkbox[] = selected
    .map((id) => available.find((c) => c.id === id))
    .filter((x): x is Checkbox => Boolean(x));

  const initialChecks: Record<string, boolean> =
    (todayChecks?.checks as Record<string, boolean>) ?? {};
  const initialDayCoins = todayChecks?.coins_earned ?? 0;

  const { total: totalDays, current: currentStreak } = summarizeStreak({
    activeDates: (activeDays ?? []).map((r) => r.check_date),
    today: ctx.today,
  });

  // 催促ロジック
  const overduePrevMonth =
    !monthPrev && isEarlyMonth(ctx.dayOfMonth) ? previousYearMonth(ctx.yearMonth) : null;
  const showMonthLateBanner = isLateMonth(ctx.dayOfMonth) && !monthThis;
  const weeklyGoalMissing = !weeklyGoal?.goal_text;
  const iso = isoDayOfWeek(ctx.weekdayJst);
  const showWeeklyGoalBanner = iso <= 2 && weeklyGoalMissing; // Mon/Tue
  const showWeeklyProgressBanner =
    iso >= 6 && // Sat/Sun
    lastWeeklyGoal?.goal_text &&
    lastWeeklyGoal.progress_text === null;

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">city-up</h1>
          <p className="text-xs text-gray-500">こんにちは、{profile?.username} さん</p>
        </div>
        <LogoutButton />
      </header>

      {/* 強制モーダル: 先月の月次未入力 */}
      {overduePrevMonth && <MonthlyOverdueModal overdueYearMonth={overduePrevMonth} />}

      {/* バナー */}
      <div className="space-y-2">
        {showMonthLateBanner && (
          <ReminderBanner
            tone="strong"
            message="今月の数値を記録しませんか?月末の習慣にしておくと続けやすい。"
            ctaLabel="入力する"
            ctaHref={`/monthly/new?ym=${ctx.yearMonth}`}
          />
        )}
        {showWeeklyGoalBanner && (
          <ReminderBanner
            message="今週の小さな目標を決めましょう。"
            ctaLabel="決める"
            ctaHref="/weekly/new"
          />
        )}
        {showWeeklyProgressBanner && (
          <ReminderBanner
            message="先週の進捗を書いてみませんか?(達成で +3 コイン)"
            ctaLabel="書く"
            ctaHref={`/weekly/progress?week=${previousWeekStartOf(ctx.today)}`}
          />
        )}
      </div>

      {/* コイン残高 */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-6 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Coins</p>
        <p className="text-5xl font-bold mt-1">{balance?.current_coins ?? 0}</p>
      </section>

      {/* 今日のチェック */}
      {selectedItems.length === 3 ? (
        <DailyChecks
          items={selectedItems}
          initialChecks={initialChecks}
          initialDayCoins={initialDayCoins}
        />
      ) : (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm">
          チェック候補の設定が必要です。
          <Link href="/settings/checkboxes" className="ml-2 underline font-medium">
            設定する
          </Link>
        </div>
      )}

      {/* 今週の目標 */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">今週の目標</h2>
          <Link href="/weekly/new" className="text-xs underline text-gray-500">
            {weeklyGoal?.goal_text ? "変更" : "設定"}
          </Link>
        </div>
        {weeklyGoal?.goal_text ? (
          <p className="text-sm">{weeklyGoal.goal_text}</p>
        ) : (
          <p className="text-sm text-gray-500">未設定</p>
        )}
      </section>

      {/* 今月の数値 */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">今月の数値({ctx.yearMonth})</h2>
          <Link
            href={`/monthly/new?ym=${ctx.yearMonth}`}
            className="text-xs underline text-gray-500"
          >
            {monthThis ? "編集" : "入力"}
          </Link>
        </div>
        {monthThis ? (
          <div className="text-sm space-y-1">
            <p>
              投稿数: <strong>{monthThis.post_count}</strong>
            </p>
            <p>
              収益: <strong>¥{monthThis.revenue_jpy.toLocaleString()}</strong>
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">未入力</p>
        )}
      </section>

      {/* 累計 / 連続日数 */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs text-gray-500">累計</p>
          <p className="text-3xl font-bold">{totalDays}<span className="text-sm font-normal text-gray-500"> 日</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">連続</p>
          <p className="text-lg font-semibold">{currentStreak}<span className="text-xs font-normal text-gray-500"> 日</span></p>
        </div>
      </section>

      {/* 設定リンク(小さく) */}
      <div className="text-center pt-2">
        <Link
          href="/settings/checkboxes"
          className="text-xs text-gray-500 underline"
        >
          チェック候補を編集
        </Link>
      </div>
    </main>
  );
}
