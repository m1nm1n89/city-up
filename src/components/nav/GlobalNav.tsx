"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "ホーム", match: (p: string) => p === "/dashboard" },
  { href: "/reflection", label: "振り返り", match: (p: string) => p.startsWith("/reflection") },
  {
    href: "/settings/checkboxes",
    label: "設定",
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

export function GlobalNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="メインナビゲーション" className="flex gap-1 text-sm">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1 transition border ${
              active
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
