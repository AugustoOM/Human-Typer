export type ThemePreference = "system" | "light" | "dark";
export type SpeedPreset = "veryFast" | "fast" | "normal" | "slow" | "custom";

export type TypingStatus =
  | "idle"
  | "countdown"
  | "typing"
  | "paused"
  | "completed"
  | "cancelled"
  | "error";

export interface Preferences {
  baseDelayMs: number;
  variationMs: number;
  countdownSeconds: number;
  punctuationPauses: boolean;
  speedPreset: SpeedPreset;
  theme: ThemePreference;
}

export interface TypingState {
  status: TypingStatus;
  current: number;
  total: number;
  countdown: number | null;
  message: string | null;
}

export interface TypingRequest {
  text: string;
  baseDelayMs: number;
  variationMs: number;
  countdownSeconds: number;
  punctuationPauses: boolean;
}

export interface RuntimeInfo {
  platform: string;
  shortcutWarning: string | null;
  accessibilityGranted: boolean;
}
