"use client";

import { create } from "zustand";
import { pickMessage } from "@/lib/mentor/engine";
import type { MentorTrigger } from "@/lib/mentor/messages";

type Bubble = {
  id: string;
  text: string;
  ttl: number; // ms
};

type MentorState = {
  current: Bubble | null;
  fire: (trigger: MentorTrigger) => void;
  dismiss: () => void;
};

export const useMentorStore = create<MentorState>((set, get) => ({
  current: null,
  fire: (trigger) => {
    const msg = pickMessage(trigger);
    if (!msg) return;
    const bubble: Bubble = {
      id: `${msg.id}-${Date.now()}`,
      text: msg.text,
      ttl: 5000,
    };
    set({ current: bubble });
    setTimeout(() => {
      // 別のメッセージで上書きされていたら何もしない
      if (get().current?.id === bubble.id) {
        set({ current: null });
      }
    }, bubble.ttl);
  },
  dismiss: () => set({ current: null }),
}));
