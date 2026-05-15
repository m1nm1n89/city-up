"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function setFinalGoalAction(
  formData: FormData,
): Promise<ActionResult> {
  const finalGoal = String(formData.get("finalGoal") ?? "").trim();
  if (!finalGoal) {
    return { ok: false, error: "最終目標を入力してください" };
  }
  if (finalGoal.length > 500) {
    return { ok: false, error: "500文字以内で入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_final_goal", {
    p_final_goal: finalGoal,
  });
  if (error) {
    console.error("[setFinalGoal] rpc error:", error);
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function setWeeklyGoalAction(
  formData: FormData,
): Promise<ActionResult> {
  const weekStart = String(formData.get("weekStart") ?? "");
  const goalText = String(formData.get("goalText") ?? "").trim();
  if (!weekStart) {
    return { ok: false, error: "週の開始日が不明です" };
  }
  if (!goalText) {
    return { ok: false, error: "今週の目標を入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_weekly_goal", {
    p_week_start: weekStart,
    p_goal_text: goalText,
  });
  if (error) {
    console.error("[setWeeklyGoal] rpc error:", error);
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function recordWeeklyProgressAction(
  formData: FormData,
): Promise<ActionResult<{ currentCoins: number; awarded: number }>> {
  const weekStart = String(formData.get("weekStart") ?? "");
  const progressText = String(formData.get("progressText") ?? "").trim();
  const achieved = formData.get("achieved") === "true";
  if (!weekStart) {
    return { ok: false, error: "週の開始日が不明です" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_weekly_progress", {
    p_week_start: weekStart,
    p_progress_text: progressText || null,
    p_achieved: achieved,
  });
  if (error) {
    console.error("[recordWeeklyProgress] rpc error:", error);
    return { ok: false, error: error.message };
  }

  const payload = data as { current_coins: number; awarded: number };
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: { currentCoins: payload.current_coins, awarded: payload.awarded },
  };
}
