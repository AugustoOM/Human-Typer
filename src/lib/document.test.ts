// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { formattedDocxBase64 } from "./fixtures/formatted";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  importDocument,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentHtml,
  serializeDocument,
} from "./document";

function file(name: string, data: Uint8Array | string, size?: number): File {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  return {
    name,
    size: size ?? bytes.length,
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () => bytes.slice().buffer,
  } as File;
}

describe("formatted documents", () => {
  it("keeps Unicode offsets, inline emphasis, blank paragraphs and soft breaks", () => {
    const result = serializeDocument({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "😀á", marks: [{ type: "bold" }] }],
        },
        { type: "paragraph" },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "A",
              marks: [{ type: "italic" }, { type: "underline" }],
            },
            { type: "hardBreak" },
            { type: "text", text: "B" },
          ],
        },
      ],
    });
    expect(result.text).toBe("😀á\n\nA\nB");
    expect(result.formatRuns[0]).toMatchObject({
      start: 0,
      end: 2,
      heading: 2,
      bold: true,
      paragraphStart: true,
    });
    expect(result.formatRuns.find((run) => run.start === 4)).toMatchObject({
      italic: true,
      underline: true,
      paragraphStart: true,
    });
    expect(result.formatRuns.find((run) => run.start === 5)?.softBreak).toBe(
      true,
    );
    expect(result.formatRuns[result.formatRuns.length - 1]).toMatchObject({
      start: 6,
      end: 7,
      bold: false,
      paragraphStart: false,
    });
  });

  it("extracts actual Word headings, emphasis and empty paragraphs", async () => {
    const bytes = Uint8Array.from(atob(formattedDocxBase64), (char) =>
      char.charCodeAt(0),
    );
    const result = await importDocument(file("formatted.docx", bytes));
    const editor = new Editor({
      extensions: [StarterKit],
      content: result.html,
    });
    const content = serializeDocument(editor.getJSON());
    editor.destroy();
    expect(content.text).toBe("Encabezado\n\n¡Hola 😀!");
    expect(content.formatRuns[0].heading).toBe(1);
    expect(content.formatRuns[content.formatRuns.length - 1]).toMatchObject({
      bold: true,
      italic: true,
      underline: true,
      strike: true,
    });
  });

  it("imports plain text as escaped paragraphs and preserves CRLF and blank lines", async () => {
    const result = await importDocument(
      file("notes.txt", "<script>literal</script>\r\n\r\nfin"),
    );
    expect(result.html).toBe(
      "<p>&lt;script&gt;literal&lt;/script&gt;</p><p></p><p>fin</p>",
    );
  });

  it("removes active HTML, remote resources and attributes without losing supported styles", () => {
    const html = sanitizeDocumentHtml(
      '<h1 onclick="bad()">Title</h1><script>bad()</script><p><strong>A</strong><a href="javascript:bad()">B</a><img src="https://example.com/a" onerror="bad()"></p>',
    );
    expect(html).toBe("<h1>Title</h1><p><strong>A</strong>B</p>");
  });

  it("rejects legacy, oversized, unsupported and corrupt files", async () => {
    await expect(importDocument(file("old.doc", ""))).rejects.toThrow(
      "legacyDoc",
    );
    await expect(
      importDocument(file("large.docx", "", MAX_DOCUMENT_BYTES + 1)),
    ).rejects.toThrow("tooLarge");
    await expect(importDocument(file("x.pdf", ""))).rejects.toThrow(
      "unsupported",
    );
    await expect(
      importDocument(file("bad.docx", "not a zip")),
    ).rejects.toThrow();
    await expect(
      importDocument(file("long.txt", "x".repeat(250_001))),
    ).rejects.toThrow("tooLong");
  });
});
