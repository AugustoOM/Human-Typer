import { describe, expect, it } from "vitest";
import {
  generateBookmarkletHref,
  generateWebCompanionScript,
} from "./webCompanion";

describe("webCompanion", () => {
  it("generates executable script with provided config", () => {
    const script = generateWebCompanionScript({
      text: "Hola mundo!",
      baseDelayMs: 70,
      variationMs: 20,
      punctuationPauses: true,
      notifyOnComplete: true,
      language: "en",
    });

    expect(script).toContain("Hola mundo!");
    expect(script).toContain('baseDelayMs":70');
    expect(script).toContain('variationMs":20');
    expect(script).toContain('punctuationPauses":true');
    expect(script).toContain("human-typer-companion-panel");
    expect(() => new Function(script)).not.toThrow();
  });

  it("generates valid javascript: URL for bookmarklet", () => {
    const href = generateBookmarkletHref({
      text: "Prueba bookmarklet",
      baseDelayMs: 60,
      variationMs: 15,
      punctuationPauses: false,
      notifyOnComplete: true,
      language: "es",
    });

    expect(href.startsWith("javascript:")).toBe(true);
    expect(href).toContain(encodeURIComponent("Prueba bookmarklet"));
  });
});
