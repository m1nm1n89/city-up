"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={() => startTransition(() => logoutAction())}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40"
      >
        {isPending ? "ログアウト中…" : "ログアウト"}
      </button>
    </form>
  );
}
