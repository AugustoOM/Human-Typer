export type ThemePreference = "system" | "light" | "dark";
export type SpeedPreset = "veryFast" | "fast" | "normal" | "slow" | "verySlow" | "custom";

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
  pauseOnFocusLoss: boolean;
  soundNotification: boolean;
  desktopNotification: boolean;
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
  pauseOnFocusLoss: boolean;
}

export interface RuntimeInfo {
  platform: string;
  shortcutWarning: string | null;
  accessibilityGranted: boolean;
  focusGuardSupported: boolean;
}
