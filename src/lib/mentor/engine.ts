import {
  mentorMessages,
  type MentorMessage,
  type MentorTrigger,
} from "./messages";

/**
 * trigger に対応するメッセージを weight 付きランダムで 1 つ選ぶ。
 * 候補が無ければ null。
 */
export function pickMessage(
  trigger: MentorTrigger,
  rng: () => number = Math.random,
): MentorMessage | null {
  const candidates = mentorMessages.filter((m) => m.trigger === trigger);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const totalWeight = candidates.reduce((sum, m) => sum + (m.weight ?? 1), 0);
  let r = rng() * totalWeight;
  for (const m of candidates) {
    r -= m.weight ?? 1;
    if (r <= 0) return m;
  }
  return candidates[candidates.length - 1];
}
