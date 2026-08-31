import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, parsePreferences } from "./preferences";

describe("preferences", () => {
  it("uses defaults for missing or malformed storage", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("not json")).toEqual(DEFAULT_PREFERENCES);
  });

  it("sanitizes persisted values", () => {
    const parsed = parsePreferences(
      JSON.stringify({
        baseDelayMs: -5,
        variationMs: 30,
        countdownSeconds: 99,
        pauseOnFocusLoss: true,
        theme: "neon",
      }),
    );
    expect(parsed.baseDelayMs).toBe(15);
    expect(parsed.countdownSeconds).toBe(30);
    expect(parsed.pauseOnFocusLoss).toBe(true);
    expect(parsed.theme).toBe("system");
  });
});
