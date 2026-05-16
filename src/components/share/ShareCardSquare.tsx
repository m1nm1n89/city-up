/**
 * 1:1 正方形のシェアカードレイアウト(1080x1080)。Instagram / note 向け。
 * Satori 互換: Flexbox のみ。
 */

import { StaticCityScene } from "./StaticCityScene";
import { appHostLabel, monthLabelFromDay } from "@/lib/share/constants";
import type { ShareCardData } from "./ShareCardLandscape";

export function ShareCardSquare(props: ShareCardData) {
  const month = monthLabelFromDay(props.day);
  const host = appHostLabel();
  const cityWidth = 1000; // 1080 - padding(40) x2
  const cityHeight = 560;

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
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#222",
          }}
        >
          Month {month}
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#555", marginTop: 4 }}>
          Day {props.day}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 8,
          marginBottom: 24,
          borderRadius: 16,
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
          scale={2.4}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#444" }}>
          Total: {props.totalActiveDays} checks
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#666", marginTop: 6 }}>
          <div style={{ display: "flex", marginRight: 24 }}>
            {props.buildingCount} buildings
          </div>
          <div style={{ display: "flex" }}>
            {props.villagerCount} villagers
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 20,
          color: "#888",
        }}
      >
        {host}
      </div>
    </div>
  );
}
