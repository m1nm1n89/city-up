"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/lib/city/seasons";
import type { Era } from "@/lib/city/eras";

export async function setSeasonAction(
  season: Season,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_season", { p_season: season });
  if (error) {
    console.error("[setSeason] rpc error:", error);
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setCurrentEraAction(
  era: Era,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_current_era", { p_era: era });
  if (error) {
    console.error("[setCurrentEra] rpc error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
