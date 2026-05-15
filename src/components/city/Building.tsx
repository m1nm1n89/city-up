"use client";

import { motion } from "framer-motion";
import { BUILDING_STYLE } from "@/lib/city/assets";
import type { Era } from "@/lib/city/eras";
import {
  BOUNCE_KEYFRAMES,
  BOUNCE_TRANSITION,
  MILESTONE_BOUNCE_KEYFRAMES,
  MILESTONE_BOUNCE_TRANSITION,
} from "@/lib/animation/presets";

type Props = {
  era: Era;
  variant: number;
  /** 出現アニメ "bounce" | "milestone" | "none" */
  enter?: "bounce" | "milestone" | "none";
};

export function Building({ era, variant, enter = "none" }: Props) {
  const styles = BUILDING_STYLE[era];
  const style = styles[variant % styles.length];

  const animateProps =
    enter === "bounce"
      ? { animate: BOUNCE_KEYFRAMES, transition: BOUNCE_TRANSITION }
      : enter === "milestone"
        ? {
            animate: MILESTONE_BOUNCE_KEYFRAMES,
            transition: MILESTONE_BOUNCE_TRANSITION,
          }
        : { animate: { scale: 1 }, transition: { duration: 0 } };

  return (
    <motion.div
      initial={{ scale: enter === "none" ? 1 : 0 }}
      {...animateProps}
      style={{
        position: "relative",
        width: style.width,
        height: style.height,
        marginBottom: 0,
        transformOrigin: "bottom center",
      }}
      aria-hidden
    >
      {/* 本体 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: style.roofShape === "none" ? 0 : 8,
          backgroundColor: style.color,
          borderRadius: 2,
        }}
      />

      {/* 屋根 */}
      {style.roofShape === "triangle" && style.roof && (
        <div
          style={{
            position: "absolute",
            top: -2,
            left: -6,
            width: 0,
            height: 0,
            borderLeft: `${style.width / 2 + 6}px solid transparent`,
            borderRight: `${style.width / 2 + 6}px solid transparent`,
            borderBottom: `18px solid ${style.roof}`,
          }}
        />
      )}
      {style.roofShape === "dome" && style.roof && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: -4,
            width: style.width + 8,
            height: 20,
            backgroundColor: style.roof,
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
          }}
        />
      )}
      {style.roofShape === "antenna" && style.roof && (
        <>
          <div
            style={{
              position: "absolute",
              top: -8,
              left: 0,
              right: 0,
              height: 8,
              backgroundColor: style.roof,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -22,
              left: "50%",
              width: 2,
              height: 14,
              backgroundColor: style.roof,
              transform: "translateX(-50%)",
            }}
          />
        </>
      )}
      {style.roofShape === "flat" && style.roof && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: -2,
            right: -2,
            height: 8,
            backgroundColor: style.roof,
          }}
        />
      )}

      {/* 煙突の煙 */}
      {style.smoke && (
        <motion.div
          initial={{ opacity: 0.4, y: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.3], y: [-2, -8, -14] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: -16,
            left: "70%",
            width: 6,
            height: 6,
            backgroundColor: "rgba(150,150,150,0.6)",
            borderRadius: "50%",
          }}
        />
      )}

      {/* 窓: 中世以降だけ薄く */}
      {(era === "modern" || era === "contemporary" || era === "future") && (
        <Windows width={style.width} height={style.height} era={era} />
      )}
    </motion.div>
  );
}

function Windows({
  width,
  height,
  era,
}: {
  width: number;
  height: number;
  era: Era;
}) {
  const cols = era === "contemporary" || era === "future" ? 3 : 2;
  const rows = Math.max(2, Math.floor((height - 16) / 20));
  const items: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            top: 14 + r * 20,
            left: 4 + c * ((width - 8) / cols) + 2,
            width: (width - 8) / cols - 4,
            height: 12,
            backgroundColor:
              era === "future"
                ? "rgba(255,255,200,0.85)"
                : "rgba(255,235,160,0.75)",
            borderRadius: 1,
          }}
        />,
      );
    }
  }
  return <>{items}</>;
}
