import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinalGoalForm } from "@/components/goals/FinalGoalForm";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("final_goal")
    .eq("user_id", user.id)
    .single();

  // 既に最終目標が設定されている場合はダッシュボードへ
  if (settings?.final_goal && settings.final_goal.trim()) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col px-4 py-6">
      <header className="flex items-center justify-between max-w-md w-full mx-auto mb-8">
        <p className="text-xs text-gray-500">{profile?.username} さん</p>
        <LogoutButton />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <FinalGoalForm />
        </div>
      </div>
    </main>
  );
}
