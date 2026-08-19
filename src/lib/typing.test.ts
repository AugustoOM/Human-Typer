import { describe, expect, it } from "vitest";
import {
  calculateProgress,
  countCharacters,
  estimateDuration,
  isActiveStatus,
} from "./typing";

describe("typing helpers", () => {
  it("counts Unicode code points rather than UTF-16 units", () => {
    expect(countCharacters("¡Hola, José! 👋")).toBe(14);
  });

  it("calculates and clamps progress", () => {
    expect(calculateProgress(154, 820)).toBe(19);
    expect(calculateProgress(12, 10)).toBe(100);
    expect(calculateProgress(1, 0)).toBe(0);
  });

  it("recognizes every active state", () => {
    expect(isActiveStatus("countdown")).toBe(true);
    expect(isActiveStatus("typing")).toBe(true);
    expect(isActiveStatus("paused")).toBe(true);
    expect(isActiveStatus("completed")).toBe(false);
  });

  it("formats a useful duration estimate", () => {
    expect(estimateDuration(100, 70)).toBe("~7 s");
    expect(estimateDuration(1_000, 70)).toBe("~1 min 10 s");
  });
});
