import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeeklyProgressForm } from "@/components/goals/WeeklyProgressForm";
import { getJstContext, previousWeekStartOf } from "@/lib/date/week";

export default async function WeeklyProgressPage(props: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { today, weekStart } = getJstContext();
  const params = await props.searchParams;
  const targetWeek =
    params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
      ? params.week
      : previousWeekStartOf(today);

  // 未来の週は不可
  if (targetWeek > weekStart) {
    redirect("/dashboard");
  }

  const { data: goal } = await supabase
    .from("weekly_goals")
    .select("goal_text, progress_text, achieved")
    .eq("user_id", user.id)
    .eq("week_start_date", targetWeek)
    .maybeSingle();

  if (!goal?.goal_text) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold">対象週の目標がありません</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {targetWeek} 開始の週には目標が設定されていません。
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <WeeklyProgressForm
          weekStart={targetWeek}
          goalText={goal.goal_text}
          initialProgress={goal.progress_text}
          initialAchieved={goal.achieved}
        />
      </div>
    </main>
  );
}
