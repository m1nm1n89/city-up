import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ReminderBanner } from "@/components/banners/ReminderBanner";
import { MonthlyOverdueModal } from "@/components/banners/MonthlyOverdueModal";
import { DashboardClient } from "./DashboardClient";
import { DayBadge } from "./DayBadge";
import {
  getJstContext,
  isEarlyMonth,
  isLateMonth,
  isoDayOfWeek,
  parseYmd,
  formatYmd,
  previousYearMonth,
  previousWeekStartOf,
} from "@/lib/date/week";
import { summarizeStreak } from "@/lib/stats/streak";
import { computeDay, eraIfShouldUpdate } from "@/lib/city/milestones";
import { setCurrentEraAction } from "@/app/actions/city";
import type { Checkbox } from "@/types/db";
import type { Season } from "@/lib/city/seasons";
import type { Era } from "@/lib/city/eras";
import type { MentorTrigger } from "@/lib/mentor/messages";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: settings },
    { data: balance },
    { data: milestone },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, started_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_settings")
      .select(
        "final_goal, selected_checkboxes, available_checkboxes, current_season",
      )
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("coin_balance")
      .select("current_coins")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("milestone_progress")
      .select("current_era")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!settings?.final_goal || !settings.final_goal.trim()) {
    redirect("/onboarding");
  }

  const ctx = getJstContext();
  const day = profile?.started_at
    ? computeDay({ startedAtIso: profile.started_at, todayJst: ctx.today })
    : 1;

  // サーバー側で era 更新が必要なら RPC 経由で巻き上げ
  if (milestone?.current_era) {
    const next = eraIfShouldUpdate({
      day,
      currentEra: milestone.current_era as Era,
    });
    if (next) {
      await setCurrentEraAction(next);
    }
  }

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

  const activeDates = (activeDays ?? []).map((r) => r.check_date as string);
  const { total: totalDays, current: currentStreak } = summarizeStreak({
    activeDates,
    today: ctx.today,
  });

  // 催促ロジック
  const overduePrevMonth =
    !monthPrev && isEarlyMonth(ctx.dayOfMonth)
      ? previousYearMonth(ctx.yearMonth)
      : null;
  const showMonthLateBanner = isLateMonth(ctx.dayOfMonth) && !monthThis;
  const weeklyGoalMissing = !weeklyGoal?.goal_text;
  const iso = isoDayOfWeek(ctx.weekdayJst);
  const showWeeklyGoalBanner = iso <= 2 && weeklyGoalMissing;
  const showWeeklyProgressBanner =
    iso >= 6 && lastWeeklyGoal?.goal_text && lastWeeklyGoal.progress_text === null;

  // 初回マウント時の trigger 判定:
  //   first_login: これまで 1 回もチェックしていない
  //   long_absence: 直近の活動が 7 日以上前
  //   それ以外: daily_return
  let initialTrigger: MentorTrigger = "daily_return";
  if (activeDates.length === 0) {
    initialTrigger = "first_login";
  } else {
    const last = parseYmd(activeDates[0]);
    const today = parseYmd(ctx.today);
    const daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
    if (daysSince >= 7) initialTrigger = "long_absence";
    // 過去 7 日以内に月次成果が未入力で月末バナーが出ているなら monthly_overdue を優先するかは要件次第。
    // 今は控えめに daily_return を維持。
  }
  // 先月の未入力モーダルが出ている時は monthly_overdue を優先
  if (overduePrevMonth) initialTrigger = "monthly_overdue";

  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">city-up</h1>
          <p className="text-xs text-gray-500">
            {profile?.username} さん · <DayBadge serverDay={day} />
          </p>
        </div>
        <LogoutButton />
      </header>

      {overduePrevMonth && <MonthlyOverdueModal overdueYearMonth={overduePrevMonth} />}

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

      {/* コイン残高 + 累計/連続 */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Coins</p>
          <p className="text-4xl font-bold mt-0.5">{balance?.current_coins ?? 0}</p>
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-xs text-gray-500">
            累計 <strong className="text-base">{totalDays}</strong> 日
          </p>
          <p className="text-xs text-gray-500">
            連続 <strong>{currentStreak}</strong> 日
          </p>
        </div>
      </section>

      {/* 街並み + メンター + 今日のチェック(クライアント) */}
      <DashboardClient
        userId={user.id}
        serverDay={day}
        serverSeason={(settings.current_season as Season) ?? "spring"}
        totalActiveDays={totalDays}
        lastActiveDate={activeDates[0] ?? null}
        todayJst={ctx.today}
        initialTrigger={initialTrigger}
        selectedItems={selectedItems}
        initialChecks={initialChecks}
        initialDayCoins={initialDayCoins}
      />

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

// 念のため未使用警告抑止
void formatYmd;
