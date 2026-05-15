import Link from "next/link";

export function ReminderBanner({
  tone = "soft",
  message,
  ctaLabel,
  ctaHref,
}: {
  tone?: "soft" | "strong";
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const palette =
    tone === "strong"
      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40"
      : "border-sky-300 bg-sky-50 dark:bg-sky-950/40";
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border ${palette} px-4 py-3`}
    >
      <p className="text-sm">{message}</p>
      <Link
        href={ctaHref}
        className="shrink-0 rounded-md bg-black text-white text-xs font-medium px-3 py-2 dark:bg-white dark:text-black"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
