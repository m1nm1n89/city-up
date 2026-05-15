import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, started_at")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">city-up</h1>
        <LogoutButton />
      </header>

      <section className="space-y-2">
        <p className="text-lg">
          ようこそ、<strong>{profile?.username ?? "ゲスト"}</strong>さん
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ここはフェーズ1の仮ダッシュボードです。
          次のフェーズで街並みUIとチェックボックスを実装します。
        </p>
      </section>
    </main>
  );
}
