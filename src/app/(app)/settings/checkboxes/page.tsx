import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckboxSettings } from "@/components/checkboxes/CheckboxSettings";
import {
  DEFAULT_CHECKBOXES,
  DEFAULT_SELECTED_IDS,
} from "@/lib/checkboxes/defaults";

export default async function CheckboxSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_settings")
    .select("available_checkboxes, selected_checkboxes")
    .eq("user_id", user.id)
    .single();

  const available =
    settings?.available_checkboxes && settings.available_checkboxes.length === 10
      ? settings.available_checkboxes
      : [...DEFAULT_CHECKBOXES];

  const selected =
    settings?.selected_checkboxes && settings.selected_checkboxes.length === 3
      ? settings.selected_checkboxes
      : [...DEFAULT_SELECTED_IDS];

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <CheckboxSettings
        initialAvailable={available}
        initialSelected={selected}
      />
    </main>
  );
}
