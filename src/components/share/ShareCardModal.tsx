"use client";

import { useEffect, useRef, useState } from "react";
import { useShareModalStore } from "@/lib/stores/shareModalStore";
import {
  APP_URL,
  buildShareText,
  type ShareCardSize,
} from "@/lib/share/constants";

type ImageState =
  | { status: "loading" }
  | { status: "ready"; url: string; blob: Blob }
  | { status: "error"; message: string };

function buildCardUrl(size: ShareCardSize, period: string | null): string {
  const qs = new URLSearchParams({ size });
  if (period) qs.set("period", period);
  // キャッシュ衝突回避(同一セッションで再生成しても新鮮なPNGを取りに行く)
  qs.set("_", String(Date.now()));
  return `/api/share-card?${qs.toString()}`;
}

async function loadImage(
  size: ShareCardSize,
  period: string | null,
): Promise<ImageState> {
  try {
    const res = await fetch(buildCardUrl(size, period), {
      credentials: "include",
    });
    if (!res.ok) {
      return {
        status: "error",
        message: `画像の生成に失敗しました(${res.status})`,
      };
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { status: "ready", url, blob };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "ネットワークエラー",
    };
  }
}

export function ShareCardModal() {
  const open = useShareModalStore((s) => s.open);
  const day = useShareModalStore((s) => s.day);
  const period = useShareModalStore((s) => s.period);
  const close = useShareModalStore((s) => s.closeShareModal);

  const [selected, setSelected] = useState<ShareCardSize>("landscape");
  const [landscape, setLandscape] = useState<ImageState>({ status: "loading" });
  const [square, setSquare] = useState<ImageState>({ status: "loading" });

  // 生成した blob URL を ref で追跡。state 変更ごとに revoke しないことで、
  // 「16:9 が完成 → 1:1 が完成」の二段階で前者を誤って解放するのを防ぐ。
  const urlsRef = useRef<string[]>([]);
  const trackUrl = (r: ImageState) => {
    if (r.status === "ready") urlsRef.current.push(r.url);
  };
  const revokeAll = () => {
    for (const u of urlsRef.current) URL.revokeObjectURL(u);
    urlsRef.current = [];
  };

  // モーダルが開く / period が変わるたびに画像を取り直す
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    revokeAll();
    setLandscape({ status: "loading" });
    setSquare({ status: "loading" });

    void loadImage("landscape", period).then((r) => {
      if (cancelled) {
        if (r.status === "ready") URL.revokeObjectURL(r.url);
        return;
      }
      trackUrl(r);
      setLandscape(r);
    });
    void loadImage("square", period).then((r) => {
      if (cancelled) {
        if (r.status === "ready") URL.revokeObjectURL(r.url);
        return;
      }
      trackUrl(r);
      setSquare(r);
    });
    return () => {
      cancelled = true;
    };
  }, [open, period]);

  // アンマウント時に残った blob URL を全部解放
  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, []);

  // ESC でクローズ
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  if (!open) return null;

  const current = selected === "landscape" ? landscape : square;

  function downloadCurrent() {
    if (current.status !== "ready") return;
    const a = document.createElement("a");
    a.href = current.url;
    a.download = `cityup_day${day}_${selected}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareOnX() {
    if (current.status !== "ready") return;
    const text = buildShareText(day);
    const url = APP_URL;

    // モバイル等で Web Share API が使えるなら、画像付きでネイティブシートを優先。
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        const file = new File(
          [current.blob],
          `cityup_day${day}_${selected}.png`,
          { type: "image/png" },
        );
        const canShareFiles =
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] });
        if (canShareFiles) {
          await navigator.share({ files: [file], text, url });
          return;
        }
        // 画像非対応のシートでもテキスト共有はできるなら使う
        await navigator.share({ text, url });
        return;
      } catch (err) {
        // ユーザーがキャンセル → 何もしない
        if ((err as { name?: string })?.name === "AbortError") return;
        // それ以外は X intent にフォールバック
      }
    }

    // フォールバック: X の intent ページを別タブで開く(画像は手動添付)
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  function shareOnLine() {
    if (current.status !== "ready") return;
    const text = buildShareText(day);
    const url = APP_URL;
    // LINE は web share endpoint がテキスト + URL のみ受ける(画像添付は不可)。
    // 画像を載せたい場合はユーザーが事前にダウンロードしてからトーク内で添付する想定。
    const intent = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-2xl my-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl p-5 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">シェアカード</h2>
            <p className="text-xs text-gray-500">
              Day {day}
              {period ? ` · ${period}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </header>

        <div className="flex gap-1 text-xs">
          <SizeTab
            active={selected === "landscape"}
            onClick={() => setSelected("landscape")}
            label="X 用 16:9"
          />
          <SizeTab
            active={selected === "square"}
            onClick={() => setSelected("square")}
            label="Instagram / note 用 1:1"
          />
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-950 min-h-[200px] flex items-center justify-center">
          {current.status === "loading" && (
            <p className="text-sm text-gray-500 py-12">作っています…</p>
          )}
          {current.status === "error" && (
            <p className="text-sm text-red-500 py-12">{current.message}</p>
          )}
          {current.status === "ready" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt={`シェアカード ${selected}`}
              className="max-w-full max-h-[55vh] w-auto h-auto object-contain block"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm"
          >
            閉じる
          </button>
          <button
            type="button"
            onClick={shareOnLine}
            disabled={current.status !== "ready"}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            LINE で共有
          </button>
          <button
            type="button"
            onClick={shareOnX}
            disabled={current.status !== "ready"}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            X で共有
          </button>
          <button
            type="button"
            onClick={downloadCurrent}
            disabled={current.status !== "ready"}
            className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            ダウンロード
          </button>
        </div>
      </div>
    </div>
  );
}

function SizeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 border transition ${
        active
          ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
          : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
      }`}
    >
      {label}
    </button>
  );
}
