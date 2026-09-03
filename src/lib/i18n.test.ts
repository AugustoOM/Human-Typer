import { describe, expect, it } from "vitest";
import { localizeNativeMessage, tr } from "./i18n";

describe("i18n", () => {
  it("selects the requested language", () => {
    expect(tr("en", "Ready", "Listo")).toBe("Ready");
    expect(tr("es", "Ready", "Listo")).toBe("Listo");
  });

  it("localizes native runtime messages", () => {
    expect(localizeNativeMessage("Typing cancelled", "es")).toBe(
      "Escritura cancelada",
    );
    expect(localizeNativeMessage("Typing cancelled", "en")).toBe(
      "Typing cancelled",
    );
  });
});
