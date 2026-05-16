import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MonthlyForm } from "@/components/monthly/MonthlyForm";
import { getJstContext, previousYearMonth } from "@/lib/date/week";
import { computeDay } from "@/lib/city/milestones";

export default async function MonthlyNewPage(props: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { yearMonth } = getJstContext();
  const params = await props.searchParams;
  const targetYm =
    params.ym && /^\d{4}-\d{2}$/.test(params.ym) ? params.ym : yearMonth;

  // 未来月は不可
  if (targetYm > yearMonth) redirect("/dashboard");

  const [{ data: current }, { data: prev }, { data: profile }] = await Promise.all([
    supabase
      .from("monthly_stats")
      .select(
        "post_count, revenue_jpy, follower_count, pv_count, other_notes",
      )
      .eq("user_id", user.id)
      .eq("year_month", targetYm)
      .maybeSingle(),
    supabase
      .from("monthly_stats")
      .select(
        "post_count, revenue_jpy, follower_count, pv_count, other_notes",
      )
      .eq("user_id", user.id)
      .eq("year_month", previousYearMonth(targetYm))
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("started_at")
      .eq("id", user.id)
      .single(),
  ]);

  const today = getJstContext().today;
  const currentDay = profile?.started_at
    ? computeDay({ startedAtIso: profile.started_at, todayJst: today })
    : 1;

  const toStrings = (
    r:
      | {
          post_count: number;
          revenue_jpy: number;
          follower_count: number | null;
          pv_count: number | null;
          other_notes: string | null;
        }
      | null,
  ) =>
    r
      ? {
          postCount: String(r.post_count),
          revenueJpy: String(r.revenue_jpy),
          followerCount: r.follower_count != null ? String(r.follower_count) : "",
          pvCount: r.pv_count != null ? String(r.pv_count) : "",
          otherNotes: r.other_notes ?? "",
        }
      : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <MonthlyForm
          yearMonth={targetYm}
          initial={toStrings(current)}
          previous={toStrings(prev)}
          currentDay={currentDay}
        />
      </div>
    </main>
  );
}
