"use client";

/**
 * Day 1〜現在の累計日数までを移動できる連続スライダー。
 * 過去の任意の日のスナップショットを再現するための入力。
 */
export function ProgressSlider({
  value,
  onChange,
  maxDay,
  totalActiveDaysAtValue,
}: {
  value: number;
  onChange: (day: number) => void;
  maxDay: number;
  /** 表示用: その day 時点での累計活動日数 */
  totalActiveDaysAtValue: number;
}) {
  const clampedMax = Math.max(1, maxDay);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-gray-600 dark:text-gray-300">
          進捗
        </span>
        <span className="text-gray-500">
          Day {value} · 活動 {totalActiveDaysAtValue} 日
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={clampedMax}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-black dark:accent-white"
        aria-label="表示する Day"
      />
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>Day 1</span>
        <span>Day {clampedMax}</span>
      </div>
    </div>
  );
}
