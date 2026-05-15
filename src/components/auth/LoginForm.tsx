"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await loginAction(formData);
      // 成功時は server action 内で redirect されるので、ここに到達するのは失敗時のみ。
      if (res && !res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ログイン</h1>
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
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
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
          autoComplete="current-password"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
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
        {isPending ? "ログイン中…" : "ログイン"}
      </button>

      <div className="flex justify-between text-sm">
        <Link href="/signup" className="underline">
          アカウント作成
        </Link>
        <Link href="/recover" className="underline text-gray-600 dark:text-gray-400">
          パスワードを忘れた
        </Link>
      </div>
    </form>
  );
}
