"use client";

import { motion } from "framer-motion";
import { VILLAGER_STYLE } from "@/lib/city/assets";
import type { Era } from "@/lib/city/eras";
import {
  VILLAGER_POP,
  VILLAGER_POP_TRANSITION,
} from "@/lib/animation/presets";

export type VillagerVisualState = {
  /** 0..1 (画面幅に対する位置) */
  xRatio: number;
  /** 表示する? (建物に入っていれば false) */
  visible: boolean;
  /** 荷物持ち? */
  hasCargo: boolean;
  /** 向き: 1 = 右、-1 = 左 */
  dir: 1 | -1;
};

type Props = {
  era: Era;
  state: VillagerVisualState;
  /** scene 幅 (px) */
  sceneWidth: number;
  /** pop アニメするか */
  pop?: boolean;
};

export function Villager({ era, state, sceneWidth, pop }: Props) {
  const color = VILLAGER_STYLE[era];
  const x = state.xRatio * sceneWidth;

  if (!state.visible) return null;

  return (
    <motion.div
      initial={pop ? { scale: 0 } : false}
      animate={pop ? VILLAGER_POP : undefined}
      transition={pop ? VILLAGER_POP_TRANSITION : undefined}
      style={{
        position: "absolute",
        bottom: 6,
        left: 0,
        transform: `translateX(${x}px) scaleX(${state.dir === 1 ? 1 : -1})`,
        willChange: "transform",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <div style={{ position: "relative", width: 12, height: 22 }}>
        {/* 頭 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 2,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: color.head,
          }}
        />
        {/* 胴体 */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 1,
            width: 10,
            height: 12,
            borderRadius: 2,
            backgroundColor: color.body,
          }}
        />
        {/* 荷物 */}
        {state.hasCargo && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: -3,
              width: 5,
              height: 6,
              backgroundColor: "#A0522D",
              borderRadius: 1,
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
