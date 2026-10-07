import { useEffect, useRef, useState } from "react";
import { IconFileSpreadsheet, IconUpload, IconX } from "@tabler/icons-react";
import {
  readSpreadsheetWorkbook,
  selectSpreadsheetRange,
  type ImportedWorkbook,
  type SpreadsheetData,
} from "../lib/spreadsheet";
import { tr } from "../lib/i18n";
import { countWords } from "../lib/typing";
import type { LanguagePreference } from "../types";
interface Props {
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
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState<ImportedWorkbook | null>(null);
  const [sheet, setSheet] = useState("");
  const [range, setRange] = useState("");
  const [skipHeader, setSkipHeader] = useState(false);
  const [preview, setPreview] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [columnPage, setColumnPage] = useState(0);
  useEffect(() => {
    if (!source) return;
    let current = true;
    const timer = setTimeout(() => {
      void selectSpreadsheetRange(source, sheet, range, skipHeader)
        .then((result) => {
          if (current) {
            setPreview(result);
            setError("");
            setPage(0);
            setColumnPage(0);
          }
        })
        .catch((reason) => {
          if (current) {
            setPreview(null);
            setError(String(reason.message || reason));
          }
        });
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [source, sheet, range, skipHeader]);
  const origin = preview?.sourceRange?.match(/^([A-Z]+)([0-9]+)/);
  const sourceRow = origin ? Number(origin[2]) : 1;
  const sourceColumn = origin
    ? Array.from(origin[1]).reduce(
        (sum, char) => sum * 26 + char.charCodeAt(0) - 64,
        0,
      ) - 1
    : 0;
  function columnLabel(index: number) {
    let label = "";
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
      label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
    return label;
  }
  async function pickFile(file?: File) {
    if (!file || disabled) return;
    setLoading(true);
    setError("");
    try {
      const book = await readSpreadsheetWorkbook(file);
      setSource(book);
      setSheet(book.sheets[0].name);
      setRange(book.sheets[0].range);
      setSkipHeader(false);
      setPreview(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <section
      className="card spreadsheet-card"
      aria-labelledby="spreadsheet-heading"
    >
      <div className="section-heading">
        <div>
          <h2 id="spreadsheet-heading">
            {tr(language, "Spreadsheet", "Planilla")}
          </h2>
          <p>
            {tr(
              language,
              "Preview a workbook and choose its sheet and source range before importing.",
              "Revisá el archivo y elegí la hoja y el rango de origen antes de importar.",
            )}
          </p>
        </div>
        <IconFileSpreadsheet size={27} />
      </div>
      {data && (
        <div className="spreadsheet-summary">
          <div>
            <strong>
              {data.fileName} · {data.sheetName} · {data.sourceRange}
            </strong>
            <span>
              {data.rowCount} × {data.columnCount}
            </span>
          </div>
          <button
            className="icon-text-button"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <IconX size={15} />
            {tr(language, "Remove", "Quitar")}
          </button>
        </div>
      )}
      <button
        className="button spreadsheet-upload"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
      >
        <IconUpload size={18} />
        {loading
          ? tr(language, "Loading…", "Cargando…")
          : tr(language, "Choose XLSX / CSV", "Elegir XLSX / CSV")}
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        aria-label={tr(language, "Import spreadsheet", "Importar planilla")}
        accept=".xlsx,.csv"
        disabled={disabled || loading}
        onChange={(event) => void pickFile(event.currentTarget.files?.[0])}
      />
      {source && (
        <div className="import-preview">
          <h3>
            {tr(language, "Import preview", "Vista previa de importación")} ·{" "}
            {source.fileName}
          </h3>
          <div className="document-controls">
            <label>
              {tr(language, "Source sheet", "Hoja de origen")}{" "}
              <select
                disabled={disabled}
                value={sheet}
                onChange={(e) => {
                  setSheet(e.target.value);
                  setRange(
                    source.sheets.find((s) => s.name === e.target.value)
                      ?.range ?? "A1",
                  );
                  setPreview(null);
                }}
              >
                {source.sheets.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              {tr(language, "Source range", "Rango de origen")}{" "}
              <input
                value={range}
                disabled={disabled}
                onChange={(e) => {
                  setRange(e.target.value);
                  setPreview(null);
                }}
                placeholder="A1:D20"
              />
            </label>
            <label className="format-option">
              <input
                type="checkbox"
                checked={skipHeader}
                disabled={disabled}
                onChange={(e) => {
                  setSkipHeader(e.target.checked);
                  setPreview(null);
                }}
              />
              {tr(language, "Skip first row", "Omitir primera fila")}
            </label>
          </div>
          {preview && (
            <>
              <p>
                {preview.rowCount} {tr(language, "rows", "filas")} ×{" "}
                {preview.columnCount} {tr(language, "columns", "columnas")} ·{" "}
                {preview.characterCount.toLocaleString(language)}{" "}
                {tr(language, "characters", "caracteres")}
                {" · "}
                {preview.rows
                  .reduce(
                    (sum, row) =>
                      sum +
                      row.reduce((count, cell) => count + countWords(cell), 0),
                    0,
                  )
                  .toLocaleString(language)}{" "}
                {tr(language, "words", "palabras")}
              </p>
              <div className="preview-grid">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      {preview.rows[0]
                        ?.slice(columnPage * 20, columnPage * 20 + 20)
                        .map((_, c) => (
                          <th key={c}>
                            {columnLabel(sourceColumn + columnPage * 20 + c)}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows
                      .slice(page * 50, page * 50 + 50)
                      .map((row, r) => (
                        <tr key={r}>
                          <th>{sourceRow + page * 50 + r}</th>
                          {row
                            .slice(columnPage * 20, columnPage * 20 + 20)
                            .map((value, c) => (
                              <td key={c}>{value}</td>
                            ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="document-controls">
                <button disabled={!page} onClick={() => setPage(page - 1)}>
                  {tr(language, "Previous rows", "Filas anteriores")}
                </button>
                <span>
                  {page + 1}/{Math.ceil(preview.rowCount / 50)}
                </span>
                <button
                  disabled={(page + 1) * 50 >= preview.rowCount}
                  onClick={() => setPage(page + 1)}
                >
                  {tr(language, "Next rows", "Filas siguientes")}
                </button>
                <button
                  disabled={!columnPage}
                  onClick={() => setColumnPage(columnPage - 1)}
                >
                  {tr(language, "Previous columns", "Columnas anteriores")}
                </button>
                <button
                  disabled={(columnPage + 1) * 20 >= preview.columnCount}
                  onClick={() => setColumnPage(columnPage + 1)}
                >
                  {tr(language, "Next columns", "Columnas siguientes")}
                </button>
              </div>
            </>
          )}
          <p className="document-hint">
            {tr(
              language,
              "Native typing uses displayed text and replaces embedded cell line breaks with spaces. Original values, types and formulas remain available for the Google Sheets API.",
              "La escritura nativa usa el texto visible y convierte los saltos dentro de celdas a espacios. Los valores, tipos y fórmulas originales quedan disponibles para la API de Google Sheets.",
            )}
          </p>
          {data && (
            <p className="document-hint">
              {tr(
                language,
                "Confirming replaces the currently prepared spreadsheet.",
                "Al confirmar se reemplaza la planilla preparada actualmente.",
              )}
            </p>
          )}
          <div className="document-controls">
            <button
              className="button secondary"
              disabled={!preview || disabled || loading}
              onClick={() => {
                if (preview) onChange(preview);
                setSource(null);
              }}
            >
              {tr(language, "Confirm import", "Confirmar importación")}
            </button>
            <button
              className="icon-text-button"
              disabled={disabled}
              onClick={() => {
                setSource(null);
                setError("");
              }}
            >
              {tr(language, "Cancel", "Cancelar")}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="spreadsheet-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
