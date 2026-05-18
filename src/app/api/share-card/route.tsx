/**
 * シェアカード生成エンドポイント。
 *
 * セキュリティ:
 *   - 認証必須(Supabase cookie セッションから auth.uid() を取得)
 *   - URL クエリで user_id を受けない設計。改ざんで他人のカードは生成不可。
 *   - RLS により、認証クライアントが叩いてもフェッチできるのは自分の行のみ。
 *
 * 戻り値:
 *   - image/png(Next.js ImageResponse 経由 = 内部 Satori)
 *
 * Cloudflare Workers (OpenNext) でも動かすため runtime は "nodejs" で固定。
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ShareCardLandscape } from "@/components/share/ShareCardLandscape";
import { ShareCardSquare } from "@/components/share/ShareCardSquare";
import { SHARE_CARD_SIZES, type ShareCardSize } from "@/lib/share/constants";
import { eraAt } from "@/lib/city/eras";
import {
  buildingCountForActivity,
  villagerCountForBuildings,
} from "@/lib/city/layout";
import { startedAtToYmd, totalActiveDaysUpTo } from "@/lib/city/snapshot";
import { getJstContext, parseYmd, formatYmd } from "@/lib/date/week";
import type { Season } from "@/lib/city/seasons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VILLAGER_CAP = 20;

// Noto Sans JP OTF を public/fonts/ から読み、isolate(またはプロセス)寿命の間キャッシュする。
// dev でも prod(Cloudflare Workers static assets)でも同じ /fonts/... パスで取れる。
let jpFontPromise: Promise<ArrayBuffer> | null = null;
function loadJpFont(origin: string): Promise<ArrayBuffer> {
  if (!jpFontPromise) {
    jpFontPromise = fetch(`${origin}/fonts/NotoSansJP-Regular.otf`).then(
      async (r) => {
        if (!r.ok) {
          jpFontPromise = null; // 失敗時は次回再試行できるよう破棄
          throw new Error(`failed to load JP font (${r.status})`);
        }
        return r.arrayBuffer();
      },
    );
  }
  return jpFontPromise;
}

function isValidPeriod(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

function endOfMonthYmd(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  // Date.UTC(y, m, 0) = (y, m月の0日) = (y, m-1月の末日)。
  // ここで m は 1-based の月。Date.UTC は 0-based 月だが
  // 0日にすることで前月末を取得 → m を渡せばその月の末日になる。
  return formatYmd(new Date(Date.UTC(y, m, 0, 12)));
}

function diffDays(fromYmd: string, toYmd: string): number {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sizeParam = url.searchParams.get("size");
  const periodParam = url.searchParams.get("period");

  const size: ShareCardSize =
    sizeParam === "square" ? "square" : "landscape";
  const dims = SHARE_CARD_SIZES[size];

  // 認証(Cookie セッション)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ctx = getJstContext();
  const [{ data: profile }, { data: settings }, { data: activeDates }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("started_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("user_settings")
        .select("current_season")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("daily_checks")
        .select("check_date")
        .eq("user_id", user.id)
        .gt("coins_earned", 0)
        .limit(2000),
    ]);

  if (!profile?.started_at) {
    return new Response("Profile not found", { status: 404 });
  }

  const startedAtYmd = startedAtToYmd(profile.started_at);
  const activeDateList = (activeDates ?? []).map(
    (r) => r.check_date as string,
  );

  // period が有効なら月末時点、無ければ今日。Day は startedAt からの経過日数+1。
  let targetYmd = ctx.today;
  if (isValidPeriod(periodParam)) {
    const eom = endOfMonthYmd(periodParam);
    targetYmd = eom > ctx.today ? ctx.today : eom;
  }
  if (targetYmd < startedAtYmd) {
    targetYmd = startedAtYmd;
  }

  const day = Math.max(1, diffDays(startedAtYmd, targetYmd) + 1);
  const totalActiveDays = totalActiveDaysUpTo({
    activeDates: activeDateList,
    upToYmd: targetYmd,
  });
  const buildingCount = buildingCountForActivity(totalActiveDays);
  const villagerCount = villagerCountForBuildings(buildingCount, VILLAGER_CAP);
  const era = eraAt(day);
  const season: Season = (settings?.current_season as Season) ?? "spring";

  const data = {
    userId: user.id, // シード用途のみ。画像には表示しない。
    day,
    era,
    season,
    buildingCount,
    villagerCount,
    totalActiveDays,
  };

  const element =
    size === "landscape" ? (
      <ShareCardLandscape {...data} />
    ) : (
      <ShareCardSquare {...data} />
    );

  // フォント取得失敗時もカード生成は止めない(英語 fallback で続行)。
  let fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: 400;
    style: "normal";
  }> = [];
  try {
    const fontData = await loadJpFont(url.origin);
    fonts = [
      { name: "Noto Sans JP", data: fontData, weight: 400, style: "normal" },
    ];
  } catch {
    // フォント無しで継続(Satori 既定の Inter が使われる、日本語は □ になる)
  }

  return new ImageResponse(element, {
    width: dims.width,
    height: dims.height,
    fonts,
    headers: {
      // 自分にしか役立たない・短時間で再生成して欲しい性質なので private 5 分。
      "Cache-Control": "private, max-age=300",
    },
  });
}
