"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function parseOptionalInt(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return NaN;
  return n;
}

function parseRequiredInt(v: FormDataEntryValue | null): number {
  if (v === null) return NaN;
  const s = String(v).trim();
  if (s === "") return NaN;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return NaN;
  return n;
}

export async function recordMonthlyStatsAction(
  formData: FormData,
): Promise<ActionResult<{ currentCoins: number; yearMonth: string }>> {
  const yearMonth = String(formData.get("yearMonth") ?? "");
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return { ok: false, error: "年月の形式が不正です" };
  }

  const postCount = parseRequiredInt(formData.get("postCount"));
  const revenueJpy = parseRequiredInt(formData.get("revenueJpy"));
  if (Number.isNaN(postCount)) {
    return { ok: false, error: "投稿数は 0 以上の整数で入力してください" };
  }
  if (Number.isNaN(revenueJpy)) {
    return { ok: false, error: "収益は 0 以上の整数で入力してください" };
  }

  const followerCount = parseOptionalInt(formData.get("followerCount"));
  const pvCount = parseOptionalInt(formData.get("pvCount"));
  if (Number.isNaN(followerCount) || Number.isNaN(pvCount)) {
    return { ok: false, error: "フォロワー数/PV数は 0 以上の整数で入力してください" };
  }

  const otherNotesRaw = String(formData.get("otherNotes") ?? "").trim();
  const otherNotes = otherNotesRaw === "" ? null : otherNotesRaw;
  if (otherNotes && otherNotes.length > 2000) {
    return { ok: false, error: "メモは 2000 文字以内で入力してください" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_monthly_stats", {
    p_year_month: yearMonth,
    p_post_count: postCount,
    p_revenue_jpy: revenueJpy,
    p_follower_count: followerCount,
    p_pv_count: pvCount,
    p_other_notes: otherNotes,
  });
  if (error) {
    console.error("[recordMonthlyStats] rpc error:", error);
    return { ok: false, error: error.message };
  }

  const payload = data as { current_coins: number; year_month: string };
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: { currentCoins: payload.current_coins, yearMonth: payload.year_month },
  };
}
