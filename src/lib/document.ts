import type { JSONContent } from "@tiptap/core";
import type { FormattedRun } from "../types";

export const MAX_DOCUMENT_CHARACTERS = 250_000;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

/** Offsets count Unicode code points, matching the native typing engine. */
export function serializeDocument(document: JSONContent): {
  text: string;
  formatRuns: FormattedRun[];
} {
  let text = "";
  let offset = 0;
  const formatRuns: FormattedRun[] = [];
  const blocks = document.content ?? [];
  blocks.forEach((block, blockIndex) => {
    const heading = block.type === "heading" ? Number(block.attrs?.level) : 0;
    let paragraphStart = true;
    const append = (value: string, node?: JSONContent, softBreak = false) => {
      if (!value) return;
      const marks = new Set(node?.marks?.map((mark) => mark.type));
      const end = offset + Array.from(value).length;
      formatRuns.push({
        start: offset,
        end,
        heading,
        paragraphStart,
        softBreak,
        bold: marks.has("bold"),
        italic: marks.has("italic"),
        underline: marks.has("underline"),
        strike: marks.has("strike"),
      });
      text += value;
      offset = end;
      paragraphStart = false;
    };
    for (const node of block.content ?? []) {
      if (node.type === "text") append(node.text ?? "", node);
      // A soft line break uses Shift+Enter during formatted transcription.
      if (node.type === "hardBreak") append("\n", node, true);
    }
    if (blockIndex < blocks.length - 1) append("\n");
  });
  return { text, formatRuns };
}

/** Restrict imported HTML to the text and styles that the typing engine supports. */
export function sanitizeDocumentHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "DEL",
    "BR",
  ]);
  const output = document.createElement("div");
  function copy(node: Node, target: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent ?? ""));
      return;
    }
    if (!(node instanceof Element)) return;
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "IMG"].includes(node.tagName))
      return;
    const isBlock = ["LI", "TR", "DIV", "BLOCKQUOTE"].includes(node.tagName);
    const element =
      allowed.has(node.tagName) || isBlock
        ? document.createElement(isBlock ? "p" : node.tagName.toLowerCase())
        : null;
    for (const child of node.childNodes) copy(child, element ?? target);
    if (element) target.appendChild(element);
    if (node.tagName === "TD" || node.tagName === "TH")
      target.appendChild(document.createTextNode("\t"));
  }
  for (const child of parsed.body.childNodes) copy(child, output);
  return output.innerHTML;
}

export async function importDocument(
  file: File,
): Promise<{ html: string; simplified: boolean }> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("tooLarge");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "doc") throw new Error("legacyDoc");
  if (extension === "txt") {
    const text = await file.text();
    if (Array.from(text).length > MAX_DOCUMENT_CHARACTERS)
      throw new Error("tooLong");
    const wrapper = document.createElement("div");
    for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      wrapper.appendChild(paragraph);
    }
    return { html: wrapper.innerHTML, simplified: false };
  }
  if (extension !== "docx") throw new Error("unsupported");
  const { default: mammoth } = await import("mammoth/mammoth.browser");
  const result = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    {
      includeEmbeddedStyleMap: false,
      ignoreEmptyParagraphs: false,
      styleMap: [
        "u => u",
        "strike => s",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Título'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Subtítulo'] => h2:fresh",
        ...Array.from(
          { length: 6 },
          (_, i) => `p[style-name='Título ${i + 1}'] => h${i + 1}:fresh`,
        ),
      ],
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    },
  );
  const html = sanitizeDocumentHtml(result.value);
  const parsed = new DOMParser().parseFromString(html, "text/html");
  if (
    Array.from(parsed.body.textContent ?? "").length > MAX_DOCUMENT_CHARACTERS
  )
    throw new Error("tooLong");
  return { html, simplified: true };
}
