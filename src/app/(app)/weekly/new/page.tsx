import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeeklyGoalForm } from "@/components/goals/WeeklyGoalForm";
import { getJstContext } from "@/lib/date/week";

export default async function WeeklyNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { weekStart } = getJstContext();
  const { data: existing } = await supabase
    .from("weekly_goals")
    .select("goal_text")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <WeeklyGoalForm weekStart={weekStart} initialGoal={existing?.goal_text} />
      </div>
    </main>
  );
}
