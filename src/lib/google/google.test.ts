import { describe, expect, it } from "vitest";
import { buildDocsInsertion } from "./docs";
import { buildSheetsValues } from "./sheets";
import type { SpreadsheetData } from "../spreadsheet";
const marks = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  heading: 0,
  paragraphStart: true,
};
describe("Google API request preparation", () => {
  it("maps code point offsets to UTF-16 and targets a specific revision and tab", () => {
    const result = buildDocsInsertion(
      "😀\nBold",
      [
        { ...marks, start: 0, end: 2, heading: 1 },
        { ...marks, start: 2, end: 6, bold: true },
      ],
      {
        index: 10,
        tabId: "t.123",
        revisionId: "revision",
        prependParagraphBreak: true,
      },
    );
    expect(result.requests[0]).toEqual({
      insertText: {
        text: "\n😀\nBold",
        location: { index: 10, tabId: "t.123" },
      },
    });
    const bold = result.requests[4];
    expect(bold).toEqual({
      updateTextStyle: {
        range: { tabId: "t.123", startIndex: 14, endIndex: 18 },
        textStyle: { bold: true },
        fields: "bold,italic,underline,strikethrough",
      },
    });
    expect(result.writeControl.requiredRevisionId).toBe("revision");
  });
  it("rejects stripped characters and malformed formatting before any write", () => {
    expect(() =>
      buildDocsInsertion("a\r\nb", [], {
        index: 1,
        tabId: "t",
        revisionId: "r",
      }),
    ).toThrow();
    expect(() =>
      buildDocsInsertion("ab", [{ ...marks, start: 1, end: 2 }], {
        index: 1,
        tabId: "t",
        revisionId: "r",
      }),
    ).toThrow();
  });
  const data: SpreadsheetData = {
    fileName: "test.xlsx",
    rows: [["0012", "2", ""]],
    rowCount: 1,
    columnCount: 3,
    characterCount: 5,
    cells: [
      [
        { value: "0012", type: "s", formatted: "0012" },
        { value: 2, type: "n", formula: "1+1", formatted: "2" },
        { value: null, type: "blank", formatted: "" },
      ],
    ],
  };
  it("preserves leading zeroes and blanks while computing an escaped destination range", () => {
    const request = buildSheetsValues(
      data,
      { sheetName: "Sales'2026", startCell: "C5" },
      "originalValues",
    );
    expect(request.range).toBe("'Sales''2026'!C5:E5");
    expect(request.body.values).toEqual([["0012", 2, null]]);
    expect(request.valueInputOption).toBe("RAW");
  });
  it("writes explicit formulas without interpreting literal strings as formulas or numbers", () => {
    const request = buildSheetsValues(
      data,
      { sheetName: "Sales", startCell: "A1" },
      "formulas",
      "clear",
    );
    expect(request.body.values).toEqual([["'0012", "=1+1", ""]]);
    expect(request.valueInputOption).toBe("USER_ENTERED");
  });
});
