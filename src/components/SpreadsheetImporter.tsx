import { useRef, useState } from "react";
import { IconFileSpreadsheet, IconUpload, IconX } from "@tabler/icons-react";
import { readSpreadsheetFile, type SpreadsheetData } from "../lib/spreadsheet";
import { tr } from "../lib/i18n";
import type { LanguagePreference } from "../types";

interface SpreadsheetImporterProps {
  disabled: boolean;
  language: LanguagePreference;
  data: SpreadsheetData | null;
  onChange: (data: SpreadsheetData | null) => void;
}

export function SpreadsheetImporter({
  disabled,
  language,
  data,
  onChange,
}: SpreadsheetImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    try {
      setError(null);
      onChange(await readSpreadsheetFile(file));
    } catch (reason) {
      onChange(null);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="card spreadsheet-card" aria-labelledby="spreadsheet-heading">
      <div className="section-heading">
        <div>
          <h2 id="spreadsheet-heading">
            {tr(language, "Spreadsheet", "Planilla")}
          </h2>
          <p>
            {tr(
              language,
              "Import an XLSX or CSV and write it cell by cell into the active blank sheet.",
              "Importá un XLSX o CSV para completarlo celda por celda en la planilla vacía activa.",
            )}
          </p>
        </div>
        <IconFileSpreadsheet size={27} aria-hidden="true" />
      </div>

      {data ? (
        <div className="spreadsheet-summary">
          <div>
            <strong>{data.fileName}</strong>
            <span>
              {data.rowCount.toLocaleString(language)} {tr(language, "rows", "filas")} × {data.columnCount.toLocaleString(language)} {tr(language, "columns", "columnas")}
            </span>
          </div>
          <button
            className="icon-text-button"
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <IconX size={15} /> {tr(language, "Remove", "Quitar")}
          </button>
        </div>
      ) : (
        <button
          className="button spreadsheet-upload"
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <IconUpload size={18} /> {tr(language, "Choose XLSX / CSV", "Elegir XLSX / CSV")}
        </button>
      )}
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        disabled={disabled}
        onChange={(event) => void pickFile(event.currentTarget.files?.[0])}
      />
      {error && <p className="spreadsheet-error">{error}</p>}
    </section>
  );
}
