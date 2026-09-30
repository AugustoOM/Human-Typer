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
      typingMistakes: true,
      notifyOnComplete: true,
      language: "en",
    });

    expect(script).toContain("Hola mundo!");
    expect(script).toContain('baseDelayMs":70');
    expect(script).toContain('variationMs":20');
    expect(script).toContain('punctuationPauses":true');
    expect(script).toContain('typingMistakes":true');
    expect(script).toContain("deletePreviousChar");
    expect(script).toContain("human-typer-companion-panel");
    expect(() => new Function(script)).not.toThrow();
  });

  it("includes Unicode format ranges and executable formatting commands", () => {
    const script = generateWebCompanionScript({
      text: "😀\nBold",
      baseDelayMs: 60,
      variationMs: 0,
      punctuationPauses: false,
      typingMistakes: false,
      notifyOnComplete: false,
      language: "es",
      formatRuns: [
        {
          start: 0,
          end: 2,
          heading: 2,
          paragraphStart: true,
          bold: false,
          italic: false,
          underline: false,
          strike: false,
        },
        {
          start: 2,
          end: 6,
          heading: 0,
          paragraphStart: true,
          bold: true,
          italic: true,
          underline: true,
          strike: true,
        },
      ],
    });
    expect(script).toContain('"start":2,"end":6');
    expect(script).toContain("applyFormat(run, targetElement)");
    expect(script).toContain('mac ? "x" : "5"');
    expect(() => new Function(script)).not.toThrow();
  });

  it("generates valid javascript: URL for bookmarklet", () => {
    const href = generateBookmarkletHref({
      text: "Prueba bookmarklet",
      baseDelayMs: 60,
      variationMs: 15,
      punctuationPauses: false,
      typingMistakes: false,
      notifyOnComplete: true,
      language: "es",
    });

    expect(href.startsWith("javascript:")).toBe(true);
    expect(href).toContain(encodeURIComponent("Prueba bookmarklet"));
  });
});
