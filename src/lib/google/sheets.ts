import type { SpreadsheetData, SpreadsheetCell } from "../spreadsheet";
export interface SheetsTarget {
  sheetName: string;
  startCell: string;
}
export type SheetsValueMode = "displayedText" | "originalValues" | "formulas";
function columnName(index: number) {
  let value = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    value = String.fromCharCode(65 + ((n - 1) % 26)) + value;
  return value;
}
function original(cell: SpreadsheetCell): string | number | boolean {
  if (cell.type === "e")
    throw new Error("Resolve spreadsheet error cells before transfer.");
  return cell.value ?? "";
}
/** Produces a fixed range, allowing the caller to preview and verify before execution. */
export function buildSheetsValues(
  data: SpreadsheetData,
  target: SheetsTarget,
  mode: SheetsValueMode = "displayedText",
  blankPolicy: "clear" | "preserve" = "preserve",
) {
  const match = /^([A-Za-z]{1,3})([1-9]\d*)$/.exec(target.startCell);
  if (
    !target.sheetName ||
    !match ||
    !data.rowCount ||
    !data.columnCount ||
    data.rows.length !== data.rowCount ||
    data.rows.some((row) => row.length !== data.columnCount)
  )
    throw new Error("Invalid Sheets destination or matrix.");
  const firstColumn =
    Array.from(match[1].toUpperCase()).reduce(
      (sum, char) => sum * 26 + char.charCodeAt(0) - 64,
      0,
    ) - 1;
  const firstRow = Number(match[2]) - 1;
  const endColumn = firstColumn + data.columnCount - 1;
  const endRow = firstRow + data.rowCount - 1;
  if (endColumn > 16383 || endRow > 1048575)
    throw new Error("Destination exceeds spreadsheet limits.");
  if (
    mode !== "displayedText" &&
    (!data.cells ||
      data.cells.length !== data.rowCount ||
      data.cells.some((row) => row.length !== data.columnCount))
  )
    throw new Error("Original spreadsheet data is unavailable.");
  const values = data.rows.map((row, r) =>
    row.map((text, c) => {
      const cell = data.cells?.[r][c];
      if ((!cell || cell.type === "blank") && text === "")
        return blankPolicy === "preserve" ? null : "";
      if (mode === "displayedText") return text;
      if (mode === "formulas" && cell?.formula) return `=${cell.formula}`;
      // USER_ENTERED parses strings; prefix literal strings to preserve leading zeroes and '='.
      const value = original(cell!);
      return mode === "formulas" && typeof value === "string"
        ? `'${value}`
        : value;
    }),
  );
  const sheet = `'${target.sheetName.replace(/'/g, "''")}'`;
  const range = `${sheet}!${columnName(firstColumn)}${firstRow + 1}:${columnName(endColumn)}${endRow + 1}`;
  return {
    range,
    valueInputOption:
      mode === "formulas" ? ("USER_ENTERED" as const) : ("RAW" as const),
    body: { range, majorDimension: "ROWS" as const, values },
    includeValuesInResponse: true,
  };
}
