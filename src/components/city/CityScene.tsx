"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building } from "./Building";
import { Villager, type VillagerVisualState } from "./Villager";
import { SeasonOverlay } from "./SeasonOverlay";
import {
  buildingCountForActivity,
  placeBuildings,
  placeVillagers,
  villagerCountForBuildings,
} from "@/lib/city/layout";
import type { Era } from "@/lib/city/eras";
import type { Season } from "@/lib/city/seasons";
import { SEASON_THEME, SEASON_LABELS, SEASONS } from "@/lib/city/seasons";
import { useEffectiveSeason } from "@/lib/stores/debugStore";

const VILLAGER_CAP = 20;

/**
 * 街並み描画。era / totalActiveDays / season を受け取って描く純粋ビュー。
 * 永続化や季節セレクタは含まない(親が責任を持つ)。
 *
 * 振り返り画面では、過去の era と過去の totalActiveDays を渡すことで
 * 「過去の自分の街」を再現できる。
 */
export function CityScene({
  userId,
  era,
  totalActiveDays,
  season,
  newlyBuiltIndex,
  newlyArrivedVillager,
}: {
  userId: string;
  era: Era;
  totalActiveDays: number;
  /** 現在表示する季節(controlled) */
  season: Season;
  /** チェック完了直後の建物 index(ボイーン対象)。null なら無し。 */
  newlyBuiltIndex?: number | null;
  /** Day 7 演出後の新規住人 index */
  newlyArrivedVillager?: number | null;
}) {
  const effective = useEffectiveSeason(season);
  const theme = SEASON_THEME[effective];

  const buildingCount = useMemo(
    () => buildingCountForActivity(totalActiveDays),
    [totalActiveDays],
  );
  const villagerCount = useMemo(
    () => villagerCountForBuildings(buildingCount, VILLAGER_CAP),
    [buildingCount],
  );

  const buildings = useMemo(
    () => placeBuildings({ userId, era, count: buildingCount }),
    [userId, era, buildingCount],
  );
  const placements = useMemo(
    () => placeVillagers({ userId, era, count: villagerCount }),
    [userId, era, villagerCount],
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
      style={{
        height: 280,
        background: `linear-gradient(to bottom, ${theme.sky} 0%, ${theme.sky} 70%, ${theme.ground} 70%, ${theme.ground} 100%)`,
      }}
    >
      <SeasonOverlay season={effective} />

      {/* 建物列(era ごとにキー切り替えで差し替え) */}
      <div className="absolute inset-x-0 bottom-0 h-[78%]">
        <AnimatePresence mode="wait">
          <motion.div
            key={era}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <BuildingRow
              buildings={buildings}
              newlyBuiltIndex={newlyBuiltIndex}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 住人(era で色が変わるが、配置は同じ) */}
      <VillagerLayer
        placements={placements}
        newlyArrivedVillager={newlyArrivedVillager}
      />
    </div>
  );
}

function BuildingRow({
  buildings,
  newlyBuiltIndex,
}: {
  buildings: ReturnType<typeof placeBuildings>;
  newlyBuiltIndex?: number | null;
}) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {buildings.map((b, i) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: `${b.xRatio * 100}%`,
            transform: "translateX(-50%)",
            // 建物の足元を「緑の地面の一番上の線」のわずか下に。
            // 地面は scene 高の 30% = 84px。70px 上げると足元は地面 top の 14px 下。
            bottom: 70,
          }}
        >
          <Building
            era={b.era}
            variant={b.variant}
            enter={newlyBuiltIndex === i ? "bounce" : "none"}
          />
          {newlyBuiltIndex === i && <SparkleBurst />}
        </div>
      ))}
    </div>
  );
}

function SparkleBurst() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        dx: (Math.random() - 0.5) * 60,
        dy: -(20 + Math.random() * 40),
        delay: Math.random() * 0.1,
      })),
    [],
  );
  return (
    <>
      {sparks.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: s.dx,
            y: s.dy,
            scale: [0, 1, 0.6],
          }}
          transition={{ duration: 0.7, delay: s.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            bottom: "60%",
            left: "50%",
            width: 6,
            height: 6,
            background: "#FFEC8B",
            borderRadius: "50%",
            boxShadow: "0 0 6px #FFD93D",
            pointerEvents: "none",
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

type VillagerRuntime = VillagerVisualState & {
  speed: number;
  insideUntil: number | null;
  popKey: number;
};

function VillagerLayer({
  placements,
  newlyArrivedVillager,
}: {
  placements: ReturnType<typeof placeVillagers>;
  newlyArrivedVillager?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(360);
  const stateRef = useRef<VillagerRuntime[]>([]);
  const rafRef = useRef<number | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    stateRef.current = placements.map((p) => ({
      xRatio: p.xRatio,
      visible: true,
      hasCargo: false,
      dir: p.dir,
      speed: p.speed,
      insideUntil: null,
      popKey: 0,
    }));
    force((n) => n + 1);
  }, [placements]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 360;
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;
      const now = Date.now();
      const w = width || 360;
      const arr = stateRef.current;
      let changed = false;

      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];

        if (!v.visible) {
          if (v.insideUntil && now >= v.insideUntil) {
            v.visible = true;
            v.insideUntil = null;
            v.hasCargo = Math.random() < 0.5;
            v.popKey += 1;
            changed = true;
          }
          continue;
        }

        const pxPerMs = v.speed / 16;
        v.xRatio += (v.dir * pxPerMs * dt) / w;

        if (v.xRatio < 0.02) {
          v.xRatio = 0.02;
          v.dir = 1;
          changed = true;
        } else if (v.xRatio > 0.98) {
          v.xRatio = 0.98;
          v.dir = -1;
          changed = true;
        }

        if (Math.random() < 0.0006 * dt) {
          v.visible = false;
          v.insideUntil = now + 2500 + Math.random() * 3500;
          v.hasCargo = false;
          changed = true;
        }
      }

      if (changed || t % 6 < 1) {
        force((n) => (n + 1) % 1_000_000);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [width]);

  return (
    <div ref={containerRef} className="absolute inset-x-0 bottom-0 h-[20%]">
      {stateRef.current.map((s, i) => (
        <Villager
          key={`${i}-${s.popKey}`}
          era={placements[i]?.era ?? "primitive"}
          state={s}
          sceneWidth={width}
          pop={newlyArrivedVillager === i || s.popKey > 0}
        />
      ))}
    </div>
  );
}

/**
 * 季節セレクタ。永続化は親に委ねる(onChange 内で各自必要なら setSeasonAction を呼ぶ)。
 */
export function SeasonSwitcher({
  current,
  onChange,
}: {
  current: Season;
  onChange: (s: Season) => void;
}) {
  return (
    <div className="flex gap-2 justify-center">
      {SEASONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium border transition ${
            current === s
              ? "bg-black text-white border-black dark:bg-white dark:text-black"
              : "border-gray-300 dark:border-gray-700"
          }`}
        >
          {SEASON_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

export type { Era };
