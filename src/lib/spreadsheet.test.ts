import { describe, expect, it } from "vitest";
import { utils } from "xlsx";
import { selectSpreadsheetRange, type ImportedWorkbook } from "./spreadsheet";
function workbook(): ImportedWorkbook {
  const first = utils.aoa_to_sheet([["first"]]);
  const second = utils.aoa_to_sheet([
    ["name", "value", "formula"],
    ["0012", 0.25, 2],
    ["😀", null, null],
    ["last", 4, 5],
  ]);
  second.B2.z = "0%";
  second.C2.f = "1+1";
  return {
    fileName: "test.xlsx",
    workbook: {
      SheetNames: ["First", "Second"],
      Sheets: { First: first, Second: second },
    },
    sheets: [
      { name: "First", range: "A1" },
      { name: "Second", range: "A1:C4" },
    ],
  };
}
describe("spreadsheet range previews", () => {
  it("chooses a later sheet, keeps Unicode, blank cells, original values and formulas", async () => {
    const data = await selectSpreadsheetRange(workbook(), "Second", "A2:C3");
    expect(data.rows).toEqual([
      ["0012", "25%", "2"],
      ["😀", "", ""],
    ]);
    expect(data.cells?.[0][1]).toMatchObject({
      value: 0.25,
      type: "n",
      numberFormat: "0%",
    });
    expect(data.cells?.[0][2].formula).toBe("1+1");
    expect(data.characterCount).toBe(9);
  });
  it("skips a header without shifting blank columns or changing source address", async () => {
    const data = await selectSpreadsheetRange(
      workbook(),
      "Second",
      "A1:C4",
      true,
    );
    expect(data.rowCount).toBe(3);
    expect(data.sourceRange).toBe("A2:C4");
    expect(data.rows[1]).toEqual(["😀", "", ""]);
  });
  it("rejects invalid, reversed, oversized and empty ranges", async () => {
    for (const range of ["bad", "A0", "C4:A1", "A1:XFD1048576", "Z9:Z10"])
      await expect(
        selectSpreadsheetRange(workbook(), "Second", range),
      ).rejects.toThrow();
  });
});
