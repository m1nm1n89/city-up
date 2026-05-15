"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FLASH_KEYFRAMES,
  FLASH_LONG_TRANSITION,
  FLASH_TRANSITION,
} from "@/lib/animation/presets";
import type { MilestoneDay } from "@/lib/city/eras";
import { useMentorStore } from "@/lib/stores/mentorStore";
import type { MentorTrigger } from "@/lib/mentor/messages";

const DAY_TO_TRIGGER: Record<MilestoneDay, MentorTrigger | null> = {
  1: null, // Day 1 は first_login で別途発火
  7: "milestone_day7",
  30: "milestone_day30",
  90: "milestone_day90",
  180: "milestone_day180",
  270: "milestone_day270",
  365: "milestone_day365",
};

export function MilestoneOverlay({ activeDay }: { activeDay: MilestoneDay | null }) {
  const [showing, setShowing] = useState<MilestoneDay | null>(null);
  const fire = useMentorStore((s) => s.fire);

  useEffect(() => {
    if (activeDay == null) return;
    setShowing(activeDay);
    const trigger = DAY_TO_TRIGGER[activeDay];
    if (trigger) fire(trigger);
    const t = setTimeout(() => setShowing(null), activeDay >= 30 ? 2400 : 1600);
    return () => clearTimeout(t);
  }, [activeDay, fire]);

  const isEraChange = useMemo(
    () => showing != null && showing >= 30,
    [showing],
  );

  return (
    <AnimatePresence>
      {showing != null && (
        <motion.div
          key={showing}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={FLASH_KEYFRAMES}
            transition={isEraChange ? FLASH_LONG_TRANSITION : FLASH_TRANSITION}
            className="absolute inset-0 bg-white"
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.15, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 1.2, times: [0, 0.5, 1] }}
            className="relative px-8 py-6 rounded-xl bg-black/80 text-white text-center shadow-2xl"
          >
            <p className="text-xs tracking-widest opacity-70">MILESTONE</p>
            <p className="text-4xl font-bold mt-1">Day {showing}</p>
            {showing === 365 && <Fireworks />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Fireworks() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        angle: (i / 24) * Math.PI * 2,
        delay: (i % 6) * 0.05,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0">
      {particles.map((p) => {
        const dx = Math.cos(p.angle) * 120;
        const dy = Math.sin(p.angle) * 120;
        const hue = (p.id * 37) % 360;
        return (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: dx,
              y: dy,
              opacity: [0, 1, 0],
              scale: [0, 1, 0.5],
            }}
            transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 8,
              height: 8,
              backgroundColor: `hsl(${hue}, 90%, 65%)`,
              borderRadius: "50%",
            }}
          />
        );
      })}
    </div>
  );
}
