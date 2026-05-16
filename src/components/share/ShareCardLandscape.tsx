/**
 * 16:9 横長のシェアカードレイアウト(1200x675)。
 * Satori 互換: Flexbox のみ、絶対配置・アニメーションなし。
 *
 * ASCII テキストに統一して Satori デフォルトフォント(Inter)で確実に出る形にしている。
 * Japanese 化が必要になったら fonts: option で Noto Sans JP 等を渡す。
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
          Month {month}
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#555" }}>
          Day {props.day}
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
            Total: {props.totalActiveDays} checks
          </div>
          <div style={{ display: "flex", marginRight: 28 }}>
            {props.buildingCount} buildings
          </div>
          <div style={{ display: "flex" }}>{props.villagerCount} villagers</div>
        </div>
        <div style={{ display: "flex", fontSize: 18, color: "#888" }}>
          {host}
        </div>
      </div>
    </div>
  );
}
