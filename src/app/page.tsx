import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 gap-10">
      <div className="text-center max-w-xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">city-up</h1>
        <p className="text-base text-gray-600 dark:text-gray-400">
          発信を通して挑戦している人のための、毎日3秒で続ける継続支援アプリ。
          数字が動かない時期も、街が育っていく。
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Link
          href="/signup"
          className="flex-1 text-center rounded-md bg-black px-4 py-3 text-white font-medium hover:opacity-90 dark:bg-white dark:text-black"
        >
          はじめる
        </Link>
        <Link
          href="/login"
          className="flex-1 text-center rounded-md border border-gray-300 dark:border-gray-700 px-4 py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          ログイン
        </Link>
      </div>
    </main>
  );
}
