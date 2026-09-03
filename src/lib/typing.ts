import type { TypingStatus } from "../types";

export const SPEED_PRESETS = {
  veryFast: { label: "Muy rápida", delay: 35 },
  fast: { label: "Rápida", delay: 65 },
  normal: { label: "Normal", delay: 120 },
  slow: { label: "Lenta", delay: 220 },
  verySlow: { label: "Muy lenta", delay: 380 },
  custom: { label: "Manual", delay: null },
} as const;

export function countCharacters(text: string): number {
  return Array.from(text).length;
}

export function calculateProgress(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

export function isActiveStatus(status: TypingStatus): boolean {
  return status === "countdown" || status === "typing" || status === "paused";
}

export function estimateDuration(total: number, delayMs: number): string {
  if (total <= 0) return "—";
  const seconds = Math.max(1, Math.round((total * delayMs) / 1_000));
  if (seconds < 60) return `~${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `~${minutes} min ${remainder} s` : `~${minutes} min`;
}
