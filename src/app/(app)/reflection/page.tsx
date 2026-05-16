import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlobalNav } from "@/components/nav/GlobalNav";
import { ShareButton } from "@/components/share/ShareButton";
import { computeDay } from "@/lib/city/milestones";
import { startedAtToYmd } from "@/lib/city/snapshot";
import { getJstContext } from "@/lib/date/week";
import { ReflectionClient } from "./ReflectionClient";
import type { Season } from "@/lib/city/seasons";

export default async function ReflectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = getJstContext();

  const [
    { data: profile },
    { data: settings },
    { data: activeDates },
    { data: monthlyStatsRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, started_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_settings")
      .select("current_season, final_goal")
      .eq("user_id", user.id)
      .single(),
    // RLS により他人の行は取れない。limit は将来 Day 1000+ にも余裕を持たせる。
    supabase
      .from("daily_checks")
      .select("check_date")
      .eq("user_id", user.id)
      .gt("coins_earned", 0)
      .order("check_date", { ascending: false })
      .limit(2000),
    supabase
      .from("monthly_stats")
      .select("year_month, post_count, revenue_jpy, follower_count, pv_count")
      .eq("user_id", user.id),
  ]);

  if (!profile?.started_at) {
    redirect("/onboarding");
  }
  if (!settings?.final_goal || !settings.final_goal.trim()) {
    redirect("/onboarding");
  }

  const startedAtYmd = startedAtToYmd(profile.started_at);
  const currentDay = computeDay({
    startedAtIso: profile.started_at,
    todayJst: ctx.today,
  });
  const activeDateList = (activeDates ?? []).map((r) => r.check_date as string);
  const monthlyStats = (monthlyStatsRows ?? []).map((r) => ({
    year_month: r.year_month as string,
    post_count: r.post_count as number,
    revenue_jpy: r.revenue_jpy as number,
    follower_count: r.follower_count as number | null,
    pv_count: r.pv_count as number | null,
  }));

  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto space-y-5">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">city-up</h1>
            <p className="text-xs text-gray-500">
              {profile.username} さん · 振り返り(Day {currentDay})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton day={currentDay} />
            <LogoutButton />
          </div>
        </div>
        <GlobalNav />
      </header>

      <ReflectionClient
        userId={user.id}
        currentDay={currentDay}
        startedAtYmd={startedAtYmd}
        activeDates={activeDateList}
        monthlyStats={monthlyStats}
        initialSeason={(settings.current_season as Season) ?? "spring"}
      />
    </main>
  );
}
