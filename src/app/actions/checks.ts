"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckResult =
  | { ok: true; data: { currentCoins: number; dayCoins: number; checkDate: string } }
  | { ok: false; error: string };

export async function recordDailyChecksAction(
  checks: Record<string, boolean>,
): Promise<CheckResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_daily_checks", {
    p_checks: checks,
  });

  if (error) {
    console.error("[recordDailyChecks] rpc error:", error);
    return { ok: false, error: error.message };
  }

  const payload = data as {
    current_coins: number;
    day_coins: number;
    check_date: string;
  };
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: {
      currentCoins: payload.current_coins,
      dayCoins: payload.day_coins,
      checkDate: payload.check_date,
    },
  };
}

export type CheckboxItem = { id: string; label: string };

export async function setCheckboxesAction(
  available: CheckboxItem[],
  selected: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_checkboxes", {
    p_available: available,
    p_selected: selected,
  });
  if (error) {
    console.error("[setCheckboxes] rpc error:", error);
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard");
  revalidatePath("/settings/checkboxes");
  return { ok: true };
}
