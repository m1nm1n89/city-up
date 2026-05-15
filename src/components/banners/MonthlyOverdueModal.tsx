import Link from "next/link";

export function MonthlyOverdueModal({ overdueYearMonth }: { overdueYearMonth: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-neutral-900 p-6 space-y-4 shadow-xl">
        <h2 className="text-xl font-bold">先月の振り返りをしませんか?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {overdueYearMonth} の数値がまだ未入力です。
          0でもOK、書くこと自体が前進です。
        </p>
        <Link
          href={`/monthly/new?ym=${overdueYearMonth}`}
          className="block w-full text-center rounded-md bg-black text-white py-3 font-medium dark:bg-white dark:text-black"
        >
          入力する (+5コイン)
        </Link>
      </div>
    </div>
  );
}
