import type { Preferences, SpeedPreset, ThemePreference } from "../types";

const STORAGE_KEY = "human-typer.preferences.v1";

export const DEFAULT_PREFERENCES: Preferences = {
  baseDelayMs: 85,
  variationMs: 35,
  countdownSeconds: 5,
  punctuationPauses: true,
  pauseOnFocusLoss: false,
  soundNotification: true,
  desktopNotification: true,
  speedPreset: "normal",
  theme: "system",
};

const speedPresets: SpeedPreset[] = [
  "veryFast",
  "fast",
  "normal",
  "slow",
  "verySlow",
  "custom",
];
const themes: ThemePreference[] = ["system", "light", "dark"];

function boundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<Preferences>;
    return {
      baseDelayMs: boundedNumber(value.baseDelayMs, 85, 15, 2_000),
      variationMs: boundedNumber(value.variationMs, 35, 0, 1_000),
      countdownSeconds: boundedNumber(value.countdownSeconds, 5, 1, 30),
      punctuationPauses:
        typeof value.punctuationPauses === "boolean"
          ? value.punctuationPauses
          : true,
      pauseOnFocusLoss:
        typeof value.pauseOnFocusLoss === "boolean"
          ? value.pauseOnFocusLoss
          : false,
      soundNotification:
        typeof value.soundNotification === "boolean"
          ? value.soundNotification
          : true,
      desktopNotification:
        typeof value.desktopNotification === "boolean"
          ? value.desktopNotification
          : true,
      speedPreset: speedPresets.includes(value.speedPreset as SpeedPreset)
        ? (value.speedPreset as SpeedPreset)
        : "normal",
      theme: themes.includes(value.theme as ThemePreference)
        ? (value.theme as ThemePreference)
        : "system",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function loadPreferences(): Preferences {
  return parsePreferences(localStorage.getItem(STORAGE_KEY));
}

export function savePreferences(preferences: Preferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
