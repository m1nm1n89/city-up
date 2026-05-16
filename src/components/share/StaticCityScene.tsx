/**
 * Satori 互換の静止画版 街並みコンポーネント。
 * - Framer Motion / 絶対配置 / transform:scale を使わず Flexbox のみで構成
 * - 既存 BUILDING_STYLE / VILLAGER_STYLE を共有(色・サイズの一貫性)
 * - 配置は xRatio を捨てて flex 等間隔(静止画では均等の方が綺麗)、
 *   variant の seed だけ live と一致させる
 *
 * このファイルは Next.js の ImageResponse(Satori)から呼ばれる前提。
 * "use client" を付けないこと(サーバー側でレンダリングするため)。
 */

import { BUILDING_STYLE, VILLAGER_STYLE, type BuildingStyle } from "@/lib/city/assets";
import type { Era } from "@/lib/city/eras";
import { SEASON_THEME, type Season } from "@/lib/city/seasons";
import { placeBuildings, placeVillagers } from "@/lib/city/layout";

type Props = {
  userId: string;
  era: Era;
  buildingCount: number;
  villagerCount: number;
  season: Season;
  width: number;
  height: number;
  /** 建物・住人をどれくらい拡大するか(共有カード全体の余裕に合わせて) */
  scale?: number;
};

export function StaticCityScene(props: Props) {
  const { userId, era, buildingCount, villagerCount, season, width, height } = props;
  const scale = props.scale ?? 1;
  const theme = SEASON_THEME[season];

  // variant は live と同じ seed で決定(色のばらつきを再現)
  const buildings = placeBuildings({ userId, era, count: buildingCount });
  const villagers = placeVillagers({ userId, era, count: villagerCount });

  // 地面の高さ(下から、住人レーン + 余白)
  const groundHeight = Math.max(60, Math.round(height * 0.18));
  const villagerLane = Math.max(28, Math.round(height * 0.07));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        background: `linear-gradient(to bottom, ${theme.sky} 0%, ${theme.sky} 70%, ${theme.ground} 70%, ${theme.ground} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* 空の余白 */}
      <div style={{ display: "flex", flex: 1 }} />

      {/* 建物列(地面のすぐ上に並ぶ) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: Math.round(groundHeight * 0.35),
        }}
      >
        {buildings.length === 0 ? (
          <div style={{ display: "flex", height: 1 }} />
        ) : (
          buildings.map((b, i) => (
            <StaticBuilding
              key={`b-${i}`}
              style={BUILDING_STYLE[b.era][b.variant]}
              scale={scale}
            />
          ))
        )}
      </div>

      {/* 住人レーン */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-end",
          paddingLeft: 40,
          paddingRight: 40,
          height: villagerLane,
        }}
      >
        {villagers.length === 0 ? (
          <div style={{ display: "flex", height: 1 }} />
        ) : (
          villagers.map((v, i) => (
            <StaticVillager key={`v-${i}`} era={v.era} scale={scale} />
          ))
        )}
      </div>
    </div>
  );
}

function StaticBuilding({
  style,
  scale,
}: {
  style: BuildingStyle;
  scale: number;
}) {
  const w = Math.round(style.width * scale);
  const h = Math.round(style.height * scale);
  const roofColor = style.roof ?? style.color;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Roof shape={style.roofShape} width={w} color={roofColor} />
      <div
        style={{
          width: w,
          height: h,
          background: style.color,
        }}
      />
    </div>
  );
}

function Roof({
  shape,
  width,
  color,
}: {
  shape: BuildingStyle["roofShape"];
  width: number;
  color: string;
}) {
  if (shape === "none") {
    return <div style={{ display: "flex", width, height: 0 }} />;
  }
  if (shape === "triangle") {
    const h = Math.round(width * 0.45);
    return (
      <div
        style={{
          display: "flex",
          width: 0,
          height: 0,
          borderLeftWidth: width / 2,
          borderLeftStyle: "solid",
          borderLeftColor: "transparent",
          borderRightWidth: width / 2,
          borderRightStyle: "solid",
          borderRightColor: "transparent",
          borderBottomWidth: h,
          borderBottomStyle: "solid",
          borderBottomColor: color,
        }}
      />
    );
  }
  if (shape === "flat") {
    return (
      <div
        style={{
          display: "flex",
          width: width + 4,
          height: 6,
          background: color,
        }}
      />
    );
  }
  if (shape === "dome") {
    const h = Math.round(width / 2);
    return (
      <div
        style={{
          display: "flex",
          width,
          height: h,
          background: color,
          borderTopLeftRadius: width / 2,
          borderTopRightRadius: width / 2,
        }}
      />
    );
  }
  // antenna
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", width: 2, height: 14, background: color }} />
      <div style={{ display: "flex", width: width + 2, height: 4, background: color }} />
    </div>
  );
}

function StaticVillager({ era, scale }: { era: Era; scale: number }) {
  const v = VILLAGER_STYLE[era];
  const head = Math.max(6, Math.round(6 * scale));
  const bodyW = Math.max(8, Math.round(8 * scale));
  const bodyH = Math.max(12, Math.round(12 * scale));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          width: head,
          height: head,
          background: v.head,
          borderRadius: head,
        }}
      />
      <div
        style={{
          display: "flex",
          width: bodyW,
          height: bodyH,
          background: v.body,
          marginTop: 1,
        }}
      />
    </div>
  );
}
