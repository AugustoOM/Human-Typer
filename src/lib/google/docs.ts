import type { FormattedRun } from "../../types";
export type GoogleParagraphStyle =
  | "NORMAL_TEXT"
  | "TITLE"
  | "SUBTITLE"
  | "HEADING_1"
  | "HEADING_2"
  | "HEADING_3"
  | "HEADING_4"
  | "HEADING_5"
  | "HEADING_6";
export interface DocsTarget {
  tabId: string;
  index: number;
  revisionId: string;
  prependParagraphBreak?: boolean;
}
interface DocsRange {
  tabId: string;
  startIndex: number;
  endIndex: number;
}
export type DocsRequest =
  | { insertText: { text: string; location: { index: number; tabId: string } } }
  | {
      updateParagraphStyle: {
        range: DocsRange;
        paragraphStyle: { namedStyleType: GoogleParagraphStyle };
        fields: string;
      };
    }
  | {
      updateTextStyle: {
        range: DocsRange;
        textStyle: Partial<
          Record<"bold" | "italic" | "underline" | "strikethrough", boolean>
        >;
        fields: string;
      };
    };
/** Pure preparation only. The authorized native Google client will execute this body. */
export function buildDocsInsertion(
  text: string,
  runs: FormattedRun[],
  target: DocsTarget,
  styles: Partial<Record<number, GoogleParagraphStyle>> = {},
) {
  if (
    !text ||
    !target.tabId ||
    !target.revisionId ||
    !Number.isInteger(target.index) ||
    target.index < 1
  )
    throw new Error("Invalid Docs insertion target.");
  const chars = Array.from(text);
  if (
    chars.length > 250_000 ||
    chars.some((char) => {
      const n = char.charCodeAt(0);
      return (n < 32 && ![9, 10].includes(n)) || (n >= 0xe000 && n <= 0xf8ff);
    })
  )
    throw new Error(
      "Unsupported Docs text; normalize it before calculating offsets.",
    );
  const prefix = target.prependParagraphBreak ? "\n" : "";
  const requests: DocsRequest[] = [
    {
      insertText: {
        text: prefix + text,
        location: { index: target.index, tabId: target.tabId },
      },
    },
  ];
  const utf16 = [0];
  for (const char of chars) utf16.push(utf16[utf16.length - 1] + char.length);
  let previousEnd = 0;
  for (const run of runs) {
    if (
      run.start !== previousEnd ||
      run.end <= run.start ||
      run.end > chars.length ||
      !Number.isInteger(run.heading) ||
      run.heading < 0 ||
      run.heading > 6 ||
      (run.paragraphStart && run.start > 0 && chars[run.start - 1] !== "\n")
    )
      throw new Error("Invalid Docs formatting range.");
    const range = {
      tabId: target.tabId,
      startIndex: target.index + prefix.length + utf16[run.start],
      endIndex: target.index + prefix.length + utf16[run.end],
    };
    if (run.paragraphStart)
      requests.push({
        updateParagraphStyle: {
          range,
          paragraphStyle: {
            namedStyleType:
              styles[run.heading] ??
              (run.heading
                ? (`HEADING_${run.heading}` as GoogleParagraphStyle)
                : "NORMAL_TEXT"),
          },
          fields: "namedStyleType",
        },
      });
    // Omitted fields reset direct formatting to inherited paragraph styles.
    const textStyle: Partial<
      Record<"bold" | "italic" | "underline" | "strikethrough", boolean>
    > = {};
    if (run.bold) textStyle.bold = true;
    if (run.italic) textStyle.italic = true;
    if (run.underline) textStyle.underline = true;
    if (run.strike) textStyle.strikethrough = true;
    requests.push({
      updateTextStyle: {
        range,
        textStyle,
        fields: "bold,italic,underline,strikethrough",
      },
    });
    previousEnd = run.end;
  }
  if (runs.length && (previousEnd !== chars.length || !runs[0].paragraphStart))
    throw new Error("Docs formatting must cover the complete text.");
  return { requests, writeControl: { requiredRevisionId: target.revisionId } };
}
