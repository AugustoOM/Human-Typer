export interface SpreadsheetData {
  fileName: string;
  rows: string[][];
  rowCount: number;
  columnCount: number;
  characterCount: number;
}

const MAX_CELLS = 100_000;
const MAX_CHARACTERS = 250_000;

function cellText(value: unknown): string {
  // A line break inside a cell would navigate to another row in Excel. Keep the
  // cell together rather than silently shifting the following data.
  return String(value ?? "").replace(/[\r\n]+/g, " ");
}

export async function readSpreadsheetFile(file: File): Promise<SpreadsheetData> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "xlsx" && extension !== "csv") {
    throw new Error("Choose an XLSX or CSV file.");
  }

  const { read, utils } = await import("xlsx");
  const workbook = read(await file.arrayBuffer(), {
    type: "array",
    cellText: true,
    cellDates: true,
  });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("The file does not contain a worksheet.");

  const grid = utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
    header: 1,
    defval: "",
    blankrows: true,
    raw: false,
  });
  const lastNonEmptyRow = grid.reduce(
    (last, row, index) =>
      row.some((cell) => cellText(cell) !== "") ? index : last,
    -1,
  );
  if (lastNonEmptyRow < 0) throw new Error("The selected worksheet is empty.");

  const sourceRows = grid.slice(0, lastNonEmptyRow + 1);
  const columnCount = sourceRows.reduce((max, row) => Math.max(max, row.length), 0);
  const rows = sourceRows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => cellText(row[index])),
  );
  const characterCount = rows.flat().reduce((total, cell) => total + cell.length, 0);
  if (rows.length * columnCount > MAX_CELLS || characterCount > MAX_CHARACTERS) {
    throw new Error(
      "The spreadsheet is too large. Limit it to 100,000 cells and 250,000 characters.",
    );
  }

  return {
    fileName: file.name,
    rows,
    rowCount: rows.length,
    columnCount,
    characterCount,
  };
}
