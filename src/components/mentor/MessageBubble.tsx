"use client";

import { motion } from "framer-motion";

export function MessageBubble({
  text,
  onDismiss,
}: {
  text: string;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      onClick={onDismiss}
      className="relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm shadow-sm cursor-pointer"
    >
      {/* 吹き出しのツノ(左下) */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: -6,
          bottom: 10,
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: "6px solid currentColor",
          color: "var(--bubble-tail, #fff)",
        }}
      />
      <p>{text}</p>
    </motion.div>
  );
}
