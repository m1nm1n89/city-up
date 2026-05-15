"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Season } from "@/lib/city/seasons";

const PARTICLE_COUNT = 18;

type Particle = {
  id: number;
  x: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
};

export function SeasonOverlay({ season }: { season: Season }) {
  // SSR と CSR で位置が一致しないと hydration mismatch になるので、
  // クライアントマウント後にだけ粒子を生成する。
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 4 + Math.random() * 4,
        drift: (Math.random() - 0.5) * 30,
        size: 6 + Math.random() * 6,
      })),
    );
  }, [season]);

  if (season === "summer") {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: "#FFD93D",
          boxShadow: "0 0 20px #FFD93D",
          pointerEvents: "none",
        }}
        aria-hidden
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {particles.map((p) => (
        <Particle key={p.id} season={season} {...p} />
      ))}
      {season === "winter" && (
        <Snowman />
      )}
      {season === "autumn" && <SmokePlume />}
    </div>
  );
}

function Particle({
  season,
  x,
  delay,
  duration,
  drift,
  size,
}: {
  season: Season;
  x: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
}) {
  const color =
    season === "spring"
      ? "#FFB7C5"
      : season === "winter"
        ? "#FFFFFF"
        : season === "autumn"
          ? "rgba(170,170,170,0.45)"
          : "#FFFFFF";
  const radius = season === "spring" ? "50%" : season === "winter" ? "50%" : "50%";
  const fallY = 240;

  return (
    <motion.div
      initial={{ y: -20, x, opacity: 0 }}
      animate={{
        y: fallY,
        x: x + drift,
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
        times: [0, 0.1, 0.85, 1],
      }}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: 0,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: radius,
      }}
    />
  );
}

function Snowman() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 4,
        left: "8%",
        width: 28,
        height: 36,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 28,
          height: 22,
          background: "#FFFFFF",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 5,
          width: 18,
          height: 18,
          background: "#FFFFFF",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 11,
          width: 4,
          height: 4,
          background: "#222",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}

function SmokePlume() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: "12%",
        width: 24,
        height: 14,
        background: "#7B3F00",
        borderRadius: "50% 50% 0 0",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.5, y: -2, x: 8 + i * 2 }}
          animate={{ opacity: [0.5, 0.2, 0], y: [-2, -28 - i * 6, -50] }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            width: 8 + i * 2,
            height: 8 + i * 2,
            background: "rgba(150,150,150,0.55)",
            borderRadius: "50%",
          }}
        />
      ))}
    </div>
  );
}
