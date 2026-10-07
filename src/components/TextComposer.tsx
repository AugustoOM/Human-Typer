import { useEffect, useRef, useState } from "react";
import { Extension, createDocument, type JSONContent } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { IconEraser, IconFileUpload } from "@tabler/icons-react";
import { countCharacters, countWords } from "../lib/typing";
import {
  importDocument,
  MAX_DOCUMENT_CHARACTERS,
  serializeDocument,
} from "../lib/document";
import { tr } from "../lib/i18n";
import type { FormattedRun, LanguagePreference } from "../types";

interface TextComposerProps {
  disabled: boolean;
  language: LanguagePreference;
  preserveFormatting: boolean;
  onFormattingChange: (value: boolean) => void;
  onChange: (text: string, runs: FormattedRun[]) => void;
}

export function TextComposer({
  disabled,
  language,
  preserveFormatting,
  onFormattingChange,
  onChange,
}: TextComposerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState<{
    name: string;
    content: JSONContent;
    html: string;
    length: number;
    words: number;
    simplified: boolean;
  } | null>(null);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  const editor = useEditor({
    extensions: [
      Extension.create({
        name: "documentLimit",
        addProseMirrorPlugins() {
          return [
            new Plugin({
              filterTransaction(transaction) {
                return (
                  !transaction.docChanged ||
                  countCharacters(
                    serializeDocument(transaction.doc.toJSON()).text,
                  ) <= MAX_DOCUMENT_CHARACTERS
                );
              },
            }),
          ];
        },
      }),
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        trailingNode: false,
      }),
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": "text-heading",
      },
      // Reject oversized edits before they enter the editor's history.
      handlePaste: (_view, event) => {
        if (
          countCharacters(event.clipboardData?.getData("text/plain") ?? "") >
          MAX_DOCUMENT_CHARACTERS
        )
          return true;
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const value = serializeDocument(editor.getJSON());
      setText(value.text);
      onChange(value.text, value.formatRuns);
    },
  });
  const selection = useEditorState({
    editor,
    selector: ({ editor }) => ({
      heading: editor?.getAttributes("heading").level ?? 0,
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
      strike: editor?.isActive("strike") ?? false,
    }),
  });
  useEffect(() => {
    editor?.setEditable(!disabled && !importing && !pending);
  }, [editor, disabled, importing, pending]);
  const locked = disabled || importing || Boolean(pending);

  async function loadFile(file: File) {
    if (locked || !editor) return;
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const result = await importDocument(file);
      if (disabledRef.current) return;
      // Parse against the editor schema before replacing the user's text.
      const content = createDocument(result.html, editor.schema);
      if (
        countCharacters(serializeDocument(content.toJSON()).text) >
        MAX_DOCUMENT_CHARACTERS
      )
        throw new Error("tooLong");
      setPending({
        name: file.name,
        content: content.toJSON(),
        html: result.html,
        length: countCharacters(serializeDocument(content.toJSON()).text),
        words: countWords(serializeDocument(content.toJSON()).text),
        simplified: result.simplified,
      });
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(
        code === "legacyDoc"
          ? tr(
              language,
              "Save the old .doc file as .docx in Word or Google Docs and import it again.",
              "Guardá el archivo .doc antiguo como .docx en Word o Google Docs e importalo nuevamente.",
            )
          : code === "tooLarge"
            ? tr(
                language,
                "The file exceeds 20 MB.",
                "El archivo supera los 20 MB.",
              )
            : code === "tooLong"
              ? tr(
                  language,
                  "The document exceeds 250,000 characters.",
                  "El documento supera los 250.000 caracteres.",
                )
              : tr(
                  language,
                  "Could not read this file. Choose a valid .docx or .txt document.",
                  "No se pudo leer el archivo. Elegí un documento .docx o .txt válido.",
                ),
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="card composer-card" aria-labelledby="text-heading">
      <div className="section-heading">
        <h2 id="text-heading">{tr(language, "Text", "Texto")}</h2>
        <div className="composer-actions">
          <span className="character-count">
            {countCharacters(text).toLocaleString(language)}{" "}
            {tr(language, "characters", "caracteres")}
            {" · "}
            {countWords(text).toLocaleString(language)}{" "}
            {tr(language, "words", "palabras")}
          </span>
          <button
            className="icon-text-button"
            type="button"
            onClick={() => {
              editor?.commands.clearContent();
              setMessage("");
              setError("");
            }}
            disabled={!text || locked}
            title={tr(language, "Clear text", "Limpiar texto")}
          >
            <IconEraser size={15} />
            {tr(language, "Clear", "Limpiar")}
          </button>
        </div>
      </div>
      <div
        className="format-toolbar"
        role="toolbar"
        aria-label={tr(language, "Text formatting", "Formato de texto")}
      >
        <select
          aria-label={tr(language, "Paragraph style", "Tipo de texto")}
          value={selection?.heading ?? 0}
          disabled={locked}
          onChange={(event) => {
            const level = Number(event.target.value);
            if (level)
              editor
                ?.chain()
                .focus()
                .setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
            else editor?.chain().focus().setParagraph().run();
          }}
        >
          <option value={0}>
            {tr(language, "Normal text", "Texto normal")}
          </option>
          <option value={1}>{tr(language, "Heading 1", "Encabezado 1")}</option>
          <option value={2}>
            {tr(language, "Subtitle / Heading 2", "Subtítulo / Encabezado 2")}
          </option>
          {[3, 4, 5, 6].map((level) => (
            <option key={level} value={level}>
              {tr(language, "Heading", "Encabezado")} {level}
            </option>
          ))}
        </select>
        {(["bold", "italic", "underline", "strike"] as const).map(
          (mark, index) => (
            <button
              key={mark}
              type="button"
              className={`icon-text-button format-${mark}`}
              aria-label={
                [
                  tr(language, "Bold", "Negrita"),
                  tr(language, "Italic", "Cursiva"),
                  tr(language, "Underline", "Subrayado"),
                  tr(language, "Strikethrough", "Tachado"),
                ][index]
              }
              title={
                [
                  tr(language, "Bold", "Negrita"),
                  tr(language, "Italic", "Cursiva"),
                  tr(language, "Underline", "Subrayado"),
                  tr(language, "Strikethrough", "Tachado"),
                ][index]
              }
              aria-pressed={selection?.[mark] ?? false}
              disabled={locked}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleMark(mark).run()}
            >
              {["B", "I", "U", "S"][index]}
            </button>
          ),
        )}
      </div>
      <div className="document-editor" data-disabled={locked}>
        <EditorContent editor={editor} />
        {!text && (
          <span className="editor-placeholder">
            {tr(
              language,
              "Paste, type or import a document…",
              "Pegá, escribí o importá un documento…",
            )}
          </span>
        )}
      </div>
      <div className="document-controls">
        <button
          className="icon-text-button"
          type="button"
          disabled={locked}
          onClick={() => fileInput.current?.click()}
        >
          <IconFileUpload size={16} />
          {importing
            ? tr(language, "Loading…", "Cargando…")
            : tr(language, "Attach DOCX / TXT", "Adjuntar DOCX / TXT")}
        </button>
        <input
          ref={fileInput}
          type="file"
          className="visually-hidden"
          aria-label={tr(language, "Import document", "Importar documento")}
          accept=".docx,.doc,.txt"
          disabled={locked}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void loadFile(file);
          }}
        />
        <label className="format-option">
          <input
            type="checkbox"
            checked={preserveFormatting}
            disabled={locked}
            onChange={(event) => onFormattingChange(event.target.checked)}
          />
          {tr(
            language,
            "Apply formatting in Google Docs",
            "Aplicar formato en Google Docs",
          )}
        </label>
      </div>
      <p className="document-hint">
        {tr(
          language,
          "Select text to format it. Customize the Heading 1–6 styles in Google Docs to use your own document design. Files are read locally and previewed before replacing the editor content. Limit: 20 MB / 250,000 characters.",
          "Seleccioná texto para darle formato. Personalizá los estilos de Encabezado 1–6 en Google Docs para usar tu propio diseño. Los archivos se leen localmente y se revisan antes de reemplazar el contenido del editor. Límite: 20 MB / 250.000 caracteres.",
        )}
      </p>
      {pending && (
        <div className="import-preview">
          <h3>
            {tr(language, "Document preview", "Vista previa del documento")} ·{" "}
            {pending.name}
          </h3>
          <p>
            {pending.length.toLocaleString(language)}{" "}
            {tr(language, "characters", "caracteres")}
            {" · "}
            {pending.words.toLocaleString(language)}{" "}
            {tr(language, "words", "palabras")}
          </p>
          <div
            className="document-preview"
            dangerouslySetInnerHTML={{ __html: pending.html }}
          />
          {pending.simplified && (
            <p className="document-hint">
              {tr(
                language,
                "Headings and emphasis are preserved. Tables and lists become text; images, fonts and page layout are omitted.",
                "Se conservan encabezados y énfasis. Tablas y listas pasan a texto; se omiten imágenes, fuentes y diseño de página.",
              )}
            </p>
          )}
          {text && (
            <p>
              {tr(
                language,
                "Confirming will replace your current editor content.",
                "Al confirmar se reemplazará el contenido actual del editor.",
              )}
            </p>
          )}
          <div className="document-controls">
            <button
              className="button secondary"
              disabled={disabled}
              onClick={() => {
                editor?.commands.setContent(pending.content);
                setMessage(
                  `${pending.name} — ${tr(language, "Document loaded.", "Documento cargado.")}`,
                );
                setPending(null);
              }}
            >
              {tr(language, "Confirm import", "Confirmar importación")}
            </button>
            <button
              className="icon-text-button"
              disabled={disabled}
              onClick={() => setPending(null)}
            >
              {tr(language, "Cancel", "Cancelar")}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="document-hint" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="spreadsheet-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
