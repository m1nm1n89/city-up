"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
} from "./recovery";
import { validatePassword, validateUsername } from "./validators";
import { usernameToDummyEmail } from "./constants";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// タイミング攻撃でユーザー名存在を漏らさないためのダミーハッシュ。
// (実在しないユーザーでも bcrypt.compare のコストを払う)
const DUMMY_BCRYPT_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.4r5Q1lQ1.5Z7Y6Yk9G8N8b6Q7yWa";

export async function signUpAction(
  formData: FormData,
): Promise<ActionResult<{ recoveryCode: string }>> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const usernameErr = validateUsername(username);
  if (usernameErr) return { ok: false, error: usernameErr };
  const passwordErr = validatePassword(password);
  if (passwordErr) return { ok: false, error: passwordErr };

  const normalizedUsername = username.toLowerCase();
  const email = usernameToDummyEmail(normalizedUsername);

  const supabase = await createClient();
  const { data: available, error: rpcErr } = await supabase.rpc(
    "is_username_available",
    { p_username: normalizedUsername },
  );
  if (rpcErr) {
    return { ok: false, error: "サーバーエラーが発生しました" };
  }
  if (!available) {
    return { ok: false, error: "このユーザーネームは既に使われています" };
  }

  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashRecoveryCode(recoveryCode);

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    console.error("[signUp] createUser failed:", createErr);
    return { ok: false, error: "ユーザー作成に失敗しました" };
  }
  const userId = created.user.id;

  const tableInserts = [
    {
      table: "profiles",
      result: await admin.from("profiles").insert({
        id: userId,
        username: normalizedUsername,
        recovery_code_hash: recoveryHash,
      }),
    },
    {
      table: "user_settings",
      result: await admin.from("user_settings").insert({ user_id: userId }),
    },
    {
      table: "coin_balance",
      result: await admin.from("coin_balance").insert({ user_id: userId }),
    },
    {
      table: "milestone_progress",
      result: await admin
        .from("milestone_progress")
        .insert({ user_id: userId }),
    },
  ];

  const failure = tableInserts.find((r) => r.result.error);
  if (failure) {
    console.error(
      `[signUp] insert into ${failure.table} failed:`,
      failure.result.error,
    );
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return {
      ok: false,
      error: `プロファイル作成に失敗しました (${failure.table}: ${failure.result.error?.message ?? "unknown"})`,
    };
  }

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    return {
      ok: false,
      error: "アカウントは作成されました。ログイン画面から再度ログインしてください。",
    };
  }

  return { ok: true, data: { recoveryCode } };
}

export async function loginAction(
  formData: FormData,
): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { ok: false, error: "ユーザーネームとパスワードを入力してください" };
  }

  const supabase = await createClient();
  const email = usernameToDummyEmail(username.toLowerCase());
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      error: "ユーザーネームまたはパスワードが正しくありません",
    };
  }

  redirect("/dashboard");
}

export async function recoverAction(
  formData: FormData,
): Promise<ActionResult<{ recoveryCode: string }>> {
  const username = String(formData.get("username") ?? "").trim();
  const recoveryCode = String(formData.get("recoveryCode") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!username || !recoveryCode || !newPassword) {
    return { ok: false, error: "全ての項目を入力してください" };
  }
  const passwordErr = validatePassword(newPassword);
  if (passwordErr) return { ok: false, error: passwordErr };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, recovery_code_hash")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  // タイミング差を消すため、profile が無い場合もダミーハッシュで比較する。
  const hashToCheck = profile?.recovery_code_hash ?? DUMMY_BCRYPT_HASH;
  const codeMatch = await verifyRecoveryCode(recoveryCode, hashToCheck);

  if (!profile || !codeMatch) {
    return {
      ok: false,
      error: "ユーザーネームまたはリカバリーコードが正しくありません",
    };
  }

  const newCode = generateRecoveryCode();
  const newHash = await hashRecoveryCode(newCode);

  const { error: pwErr } = await admin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });
  if (pwErr) {
    return { ok: false, error: "パスワード更新に失敗しました" };
  }

  const { error: hashErr } = await admin
    .from("profiles")
    .update({ recovery_code_hash: newHash })
    .eq("id", profile.id);
  if (hashErr) {
    return { ok: false, error: "リカバリーコード更新に失敗しました" };
  }

  return { ok: true, data: { recoveryCode: newCode } };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
