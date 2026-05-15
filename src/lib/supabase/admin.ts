import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * service_role を使う管理クライアント。RLS をバイパスする「神権限」。
 * - 必ずサーバー側 (Server Action / Route Handler) でのみ呼ぶこと
 * - レスポンスに含めない、ログに出さない
 * - 利用は最小限(現状はリカバリーコードによるパスワードリセットのみ)
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL が未設定です",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
