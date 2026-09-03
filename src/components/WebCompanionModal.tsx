import { useEffect, useState } from "react";
import { join, resourceDir } from "@tauri-apps/api/path";
import {
  IconBolt,
  IconCheck,
  IconCopy,
  IconDownload,
  IconInfoCircle,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { downloadExtensionZip } from "../lib/extensionPacker";
import { generateWebCompanionScript } from "../lib/webCompanion";
import { tr } from "../lib/i18n";
import type { Preferences } from "../types";

interface WebCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  preferences: Preferences;
}

export function WebCompanionModal({
  isOpen,
  onClose,
  text,
  preferences,
}: WebCompanionModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedExtensionPath, setCopiedExtensionPath] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);
  const [extensionPath, setExtensionPath] = useState("chrome-extension");

  useEffect(() => {
    if (!isOpen) return;

    void (async () => {
      try {
        setExtensionPath(await join(await resourceDir(), "chrome-extension"));
      } catch {
        setExtensionPath("chrome-extension");
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const language = preferences.language;

  const scriptCode = generateWebCompanionScript({
    text:
      text ||
      tr(
        language,
        "Sample text for Human Typer...",
        "Texto de ejemplo para Human Typer...",
      ),
    baseDelayMs: preferences.baseDelayMs,
    variationMs: preferences.variationMs,
    punctuationPauses: preferences.punctuationPauses,
    typingMistakes: preferences.typingMistakes,
    notifyOnComplete: preferences.desktopNotification,
    language,
  });

  function handleCopyScript() {
    navigator.clipboard.writeText(scriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  }

  function handleCopyExtensionPath() {
    void navigator.clipboard.writeText(extensionPath);
    setCopiedExtensionPath(true);
    setTimeout(() => setCopiedExtensionPath(false), 2500);
  }

  function handleDownloadZip() {
    downloadExtensionZip();
    setDownloadedZip(true);
    setTimeout(() => setDownloadedZip(false), 2500);
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="web-modal-title"
      >
        <header className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <IconBolt size={20} />
            </div>
            <div>
              <h3 id="web-modal-title">
                {tr(
                  language,
                  "Background Typing (Google Docs / Web / Word Online)",
                  "Escritura en segundo plano (Google Docs / Web / Word Online)",
                )}
              </h3>
              <p className="modal-subtitle">
                {tr(
                  language,
                  "Keep typing in your web document while watching videos or browsing other tabs.",
                  "Seguí escribiendo en tu documento web mientras mirás videos o navegás en otras pestañas.",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={tr(language, "Close dialog", "Cerrar ventana")}
          >
            <IconX size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="feature-banner">
            <IconSparkles size={20} className="feature-icon" />
            <div>
              <strong>
                {tr(
                  language,
                  "100% Focus Independent",
                  "100% independiente del foco",
                )}
              </strong>
              <p>
                {tr(
                  language,
                  "This method injects human-paced typing directly into the document. You can switch windows, watch YouTube in full screen, or play without interruptions or interference with your keyboard.",
                  "Este método inyecta la escritura con ritmo humano directamente en el documento. Podés cambiar de ventana, ver YouTube en pantalla completa o jugar sin interrupciones ni interferencias con tu teclado.",
                )}
              </p>
            </div>
          </div>

          <div className="methods-grid">
            <div className="method-card">
              <div className="method-header">
                <div className="step-badge">
                  {tr(
                    language,
                    "Recommended · One Click",
                    "Recomendado · Un clic",
                  )}
                </div>
                <h4>
                  {tr(
                    language,
                    "Extension for Chrome, Edge, and Firefox",
                    "Extensión para Chrome, Edge y Firefox",
                  )}
                </h4>
              </div>
              <p className="method-desc">
                {tr(
                  language,
                  "Adds a permanent Human Typer button to your browser for Google Docs and any website:",
                  "Agrega un botón permanente de Human Typer al navegador para Google Docs y cualquier web:",
                )}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  margin: "10px 0 16px",
                }}
              >
                <button
                  type="button"
                  className={`action-btn ${downloadedZip ? "copied" : "primary"}`}
                  onClick={handleDownloadZip}
                >
                  {downloadedZip ? (
                    <IconCheck size={18} />
                  ) : (
                    <IconDownload size={18} />
                  )}
                  {downloadedZip
                    ? tr(
                        language,
                        "Extension Downloaded!",
                        "¡Extensión descargada!",
                      )
                    : tr(
                        language,
                        "Download Extension (.ZIP)",
                        "Descargar extensión (.ZIP)",
                      )}
                </button>
              </div>

              <ol className="step-list">
                <li>
                  {tr(language, "Open", "Abrí")}{" "}
                  <strong>chrome://extensions</strong>,{" "}
                  {tr(language, "or Firefox's", "o la página de Firefox")}{" "}
                  <strong>about:debugging</strong>.
                </li>
                <li>
                  {tr(language, "Enable", "Activá")}{" "}
                  <strong>
                    {tr(
                      language,
                      '"Developer mode"',
                      '"Modo de desarrollador"',
                    )}
                  </strong>{" "}
                  {tr(language, "(top right).", "(arriba a la derecha).")}
                </li>
                <li>
                  {tr(language, "Click", "Pulsá")}{" "}
                  <strong>
                    {tr(language, '"Load unpacked"', '"Cargar descomprimida"')}
                  </strong>{" "}
                  {tr(
                    language,
                    "and select the extracted extension folder.",
                    "y seleccioná la carpeta extraída de la extensión.",
                  )}
                </li>
              </ol>
              <button
                type="button"
                className={`action-btn ${copiedExtensionPath ? "copied" : "primary"}`}
                onClick={handleCopyExtensionPath}
              >
                {copiedExtensionPath ? (
                  <IconCheck size={18} />
                ) : (
                  <IconCopy size={18} />
                )}
                {copiedExtensionPath
                  ? tr(language, "Folder Path Copied!", "¡Ruta copiada!")
                  : tr(
                      language,
                      "Copy Extension Folder Path",
                      "Copiar ruta de la extensión",
                    )}
              </button>
            </div>

            <div className="method-card">
              <div className="method-header">
                <div className="step-badge">
                  {tr(
                    language,
                    "Alternative · No Installation",
                    "Alternativa · Sin instalar",
                  )}
                </div>
                <h4>
                  {tr(language, "Paste into Console", "Pegar en la consola")} ({" "}
                  <kbd>F12</kbd>)
                </h4>
              </div>
              <p className="method-desc">
                {tr(
                  language,
                  "Type instantly in any active tab without installing anything:",
                  "Escribí al instante en cualquier pestaña activa sin instalar nada:",
                )}
              </p>
              <ol className="step-list">
                <li>
                  {tr(language, "Open your", "Abrí tu documento de")}{" "}
                  <strong>Google Docs</strong>.
                </li>
                <li>
                  {tr(language, "Press", "Presioná")} <kbd>F12</kbd> ({" "}
                  {tr(language, "or right-click", "o clic derecho")} →{" "}
                  <em>{tr(language, "Inspect", "Inspeccionar")}</em> →{" "}
                  <strong>{tr(language, "Console", "Consola")}</strong>).
                </li>
                <li>
                  {tr(
                    language,
                    "Paste the generated code and press",
                    "Pegá el código generado y presioná",
                  )}{" "}
                  <kbd>Enter</kbd>.
                </li>
              </ol>
              <button
                type="button"
                className={`action-btn ${copiedCode ? "copied" : "secondary"}`}
                onClick={handleCopyScript}
              >
                {copiedCode ? <IconCheck size={18} /> : <IconCopy size={18} />}
                {copiedCode
                  ? tr(language, "Code Copied!", "¡Código copiado!")
                  : tr(
                      language,
                      "Copy Code for Console",
                      "Copiar código para la consola",
                    )}
              </button>
            </div>
          </div>

          <div className="modal-tip-box">
            <IconInfoCircle size={16} />
            <span>
              {tr(
                language,
                `Includes your current speed (${preferences.baseDelayMs} ms), variation (±${preferences.variationMs} ms), punctuation pauses, typing mistakes, and sound and desktop notifications on completion.`,
                `Incluye tus ajustes actuales de velocidad (${preferences.baseDelayMs} ms), variación (±${preferences.variationMs} ms), pausas de puntuación, errores de tipeo y avisos con sonido y notificación al finalizar.`,
              )}
            </span>
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            {tr(language, "Got it", "Entendido")}
          </button>
        </footer>
      </div>
    </div>
  );
}
