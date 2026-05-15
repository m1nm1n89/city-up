"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { recoverAction } from "@/lib/auth/actions";
import { RecoveryCodeDisplay } from "./RecoveryCodeDisplay";

export function RecoverForm() {
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await recoverAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNewCode(res.data.recoveryCode);
    });
  }

  if (newCode) {
    return <RecoveryCodeDisplay code={newCode} isReset />;
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">パスワードリセット</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          サインアップ時に表示されたリカバリーコードと新しいパスワードを入力してください。
          リセット後、新しいリカバリーコードが発行されます。
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
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="recoveryCode" className="text-sm font-medium">
          リカバリーコード
        </label>
        <input
          id="recoveryCode"
          name="recoveryCode"
          type="text"
          required
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 font-mono tracking-widest"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="newPassword" className="text-sm font-medium">
          新しいパスワード
        </label>
        <input
          id="newPassword"
          name="newPassword"
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
        {isPending ? "リセット中…" : "パスワードをリセット"}
      </button>

      <p className="text-sm text-center">
        <Link href="/login" className="underline">
          ログイン画面に戻る
        </Link>
      </p>
    </form>
  );
}
