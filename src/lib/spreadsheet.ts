import type { WorkBook } from "xlsx";
export interface SpreadsheetCell {
  value: string | number | boolean | null;
  type: string;
  formula?: string;
  formatted: string;
  numberFormat?: string;
}
export interface SpreadsheetData {
  fileName: string;
  sheetName?: string;
  sourceRange?: string;
  rows: string[][];
  cells?: SpreadsheetCell[][];
  rowCount: number;
  columnCount: number;
  characterCount: number;
}
export interface ImportedWorkbook {
  fileName: string;
  workbook: WorkBook;
  sheets: { name: string; range: string }[];
}
const MAX_CELLS = 100_000;
const MAX_CHARACTERS = 250_000;
const MAX_BYTES = 20 * 1024 * 1024;
function cellText(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ");
}
export async function readSpreadsheetWorkbook(
  file: File,
): Promise<ImportedWorkbook> {
  if (!/\.(xlsx|csv)$/i.test(file.name))
    throw new Error("Choose an XLSX or CSV file.");
  if (file.size > MAX_BYTES) throw new Error("The file exceeds 20 MB.");
  const { read } = await import("xlsx");
  const workbook = read(await file.arrayBuffer(), {
    type: "array",
    cellText: true,
    cellNF: true,
    cellDates: false,
  });
  if (!workbook.SheetNames.length)
    throw new Error("The file does not contain a worksheet.");
  return {
    fileName: file.name,
    workbook,
    sheets: workbook.SheetNames.map((name) => ({
      name,
      range: workbook.Sheets[name]["!ref"] ?? "A1",
    })),
  };
}
export async function selectSpreadsheetRange(
  source: ImportedWorkbook,
  sheetName: string,
  range: string,
  skipHeader = false,
): Promise<SpreadsheetData> {
  if (!/^[A-Za-z]{1,3}[1-9]\d*(?::[A-Za-z]{1,3}[1-9]\d*)?$/.test(range))
    throw new Error("Enter a valid range, for example A1:D20.");
  const { utils } = await import("xlsx");
  const sheet = source.workbook.Sheets[sheetName];
  if (!sheet) throw new Error("The selected worksheet is unavailable.");
  const area = utils.decode_range(range.toUpperCase());
  if (
    area.e.r < area.s.r ||
    area.e.c < area.s.c ||
    area.e.r > 1048575 ||
    area.e.c > 16383
  )
    throw new Error("Invalid spreadsheet range.");
  const rowCount = area.e.r - area.s.r + 1 - (skipHeader ? 1 : 0);
  const columnCount = area.e.c - area.s.c + 1;
  if (rowCount <= 0 || rowCount * columnCount > MAX_CELLS)
    throw new Error("Select between 1 and 100,000 cells.");
  let characterCount = 0;
  const cells: SpreadsheetCell[][] = [];
  const rows: string[][] = [];
  for (let r = area.s.r + (skipHeader ? 1 : 0); r <= area.e.r; r++) {
    const row: string[] = [];
    const metadata: SpreadsheetCell[] = [];
    for (let c = area.s.c; c <= area.e.c; c++) {
      const cell = sheet[utils.encode_cell({ r, c })];
      const formatted = cell ? utils.format_cell(cell) : "";
      const text = cellText(formatted);
      characterCount += Array.from(text).length;
      if (characterCount > MAX_CHARACTERS)
        throw new Error("The selection exceeds 250,000 characters.");
      row.push(text);
      metadata.push({
        value: cell?.v ?? null,
        type: cell?.t ?? "blank",
        formula: cell?.f,
        formatted,
        numberFormat: cell?.z,
      });
    }
    rows.push(row);
    cells.push(metadata);
  }
  if (!rows.some((row) => row.some((cell) => cell !== "")))
    throw new Error("The selected range is empty.");
  return {
    fileName: source.fileName,
    sheetName,
    sourceRange: utils.encode_range({
      s: { r: area.s.r + (skipHeader ? 1 : 0), c: area.s.c },
      e: area.e,
    }),
    rows,
    cells,
    rowCount,
    columnCount,
    characterCount,
  };
}
export async function readSpreadsheetFile(
  file: File,
): Promise<SpreadsheetData> {
  const source = await readSpreadsheetWorkbook(file);
  return selectSpreadsheetRange(
    source,
    source.sheets[0].name,
    source.sheets[0].range,
  );
}
