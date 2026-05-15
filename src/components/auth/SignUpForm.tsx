"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signUpAction } from "@/lib/auth/actions";
import { RecoveryCodeDisplay } from "./RecoveryCodeDisplay";

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await signUpAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRecoveryCode(res.data.recoveryCode);
    });
  }

  if (recoveryCode) {
    return <RecoveryCodeDisplay code={recoveryCode} />;
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">アカウント作成</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          メアドは取得しません。ユーザーネームとパスワードだけで始められます。
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="username" className="text-sm font-medium">
          ユーザーネーム
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_-]+"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
        <p className="text-xs text-gray-500">英数字・ハイフン・アンダースコア 3〜20文字</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
        <p className="text-xs text-gray-500">8文字以上、英字と数字を含めてください</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-black text-white py-3 font-medium disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {isPending ? "作成中…" : "アカウントを作成"}
      </button>

      <p className="text-sm text-center text-gray-600 dark:text-gray-400">
        すでにアカウントをお持ちですか?{" "}
        <Link href="/login" className="underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
