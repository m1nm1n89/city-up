/**
 * 16:9 横長のシェアカードレイアウト(1200x675)。
 * Satori 互換: Flexbox のみ、絶対配置・アニメーションなし。
 *
 * 日本語は route 側で渡す Noto Sans JP で描画される。
 * フォント取得失敗時は Satori デフォルトの Inter にフォールバックするので、
 * その場合は日本語が □ になる(機能停止はしない)。
 */

import { StaticCityScene } from "./StaticCityScene";
import { appHostLabel, monthLabelFromDay } from "@/lib/share/constants";
import type { Era } from "@/lib/city/eras";
import type { Season } from "@/lib/city/seasons";

export type ShareCardData = {
  userId: string;
  day: number;
  era: Era;
  season: Season;
  buildingCount: number;
  villagerCount: number;
  totalActiveDays: number;
};

export function ShareCardLandscape(props: ShareCardData) {
  const month = monthLabelFromDay(props.day);
  const host = appHostLabel();
  const cityWidth = 1120; // 1200 - padding(40) x2
  const cityHeight = 410;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#FAFAFA",
        padding: 40,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#222" }}>
          {month} ヶ月目
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#555" }}>
          {props.day} 日目
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 20,
          marginBottom: 20,
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "#ddd",
        }}
      >
        <StaticCityScene
          userId={props.userId}
          era={props.era}
          buildingCount={props.buildingCount}
          villagerCount={props.villagerCount}
          season={props.season}
          width={cityWidth}
          height={cityHeight}
          scale={2.2}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: "#444" }}>
          <div style={{ display: "flex", marginRight: 28 }}>
            累計 {props.totalActiveDays} 日
          </div>
          <div style={{ display: "flex", marginRight: 28 }}>
            建物 {props.buildingCount} 棟
          </div>
          <div style={{ display: "flex" }}>住人 {props.villagerCount} 人</div>
        </div>
        <div style={{ display: "flex", fontSize: 18, color: "#888" }}>
          {host}
        </div>
      </div>
    </div>
  );
}
