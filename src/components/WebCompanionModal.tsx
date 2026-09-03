import { useEffect, useState } from "react";
import { join, resourceDir } from "@tauri-apps/api/path";
import { Check, Copy, Info, Sparkles, X, Zap } from "lucide-react";
import { generateWebCompanionScript } from "../lib/webCompanion";
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

  const scriptCode = generateWebCompanionScript({
    text: text || "Texto de ejemplo para Human Typer...",
    baseDelayMs: preferences.baseDelayMs,
    variationMs: preferences.variationMs,
    punctuationPauses: preferences.punctuationPauses,
    notifyOnComplete: preferences.desktopNotification,
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
              <Zap size={20} />
            </div>
            <div>
              <h3 id="web-modal-title">
                Escritura en Segundo Plano (Google Docs / Web / Word Online)
              </h3>
              <p className="modal-subtitle">
                Escribe fijamente en tu documento web mientras miras videos o
                navegas en otras pestañas.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="feature-banner">
            <Sparkles size={20} className="feature-icon" />
            <div>
              <strong>100% Independiente del Foco</strong>
              <p>
                Este método inyecta la escritura con ritmo humano directamente
                en el documento. Puedes cambiar de ventana, ver YouTube a
                pantalla completa o jugar sin que se interrumpa ni interfiera
                con tu teclado.
              </p>
            </div>
          </div>

          <div className="methods-grid">
            <div className="method-card">
              <div className="method-header">
                <div className="step-badge">Recomendado · 1 Solo Clic</div>
                <h4>Extensión para Chrome y Edge</h4>
              </div>
              <p className="method-desc">
                Te da el botón permanente ⚡ en tu navegador para Google Docs y
                cualquier web:
              </p>
              <ol className="step-list">
                <li>
                  Abre en tu navegador: <strong>chrome://extensions</strong>
                </li>
                <li>
                  Activa <strong>"Modo de desarrollador"</strong> (arriba a la
                  derecha).
                </li>
                <li>
                  Pulsa <strong>"Cargar descomprimida"</strong> y elige la
                  carpeta de la extensión:
                </li>
              </ol>
              <button
                type="button"
                className={`action-btn ${copiedExtensionPath ? "copied" : "primary"}`}
                onClick={handleCopyExtensionPath}
              >
                {copiedExtensionPath ? <Check size={18} /> : <Copy size={18} />}
                {copiedExtensionPath
                  ? "¡Ruta de Carpeta Copiada!"
                  : "Copiar Ruta de la Extensión"}
              </button>
            </div>

            <div className="method-card">
              <div className="method-header">
                <div className="step-badge">Alternativa · Sin Instalar</div>
                <h4>
                  Pegar en Consola (<kbd>F12</kbd>)
                </h4>
              </div>
              <p className="method-desc">
                Escribe al instante en cualquier pestaña activa sin instalar
                nada:
              </p>
              <ol className="step-list">
                <li>
                  Ve a tu documento de <strong>Google Docs</strong>.
                </li>
                <li>
                  Presiona <kbd>F12</kbd> (o clic derecho →{" "}
                  <em>Inspeccionar</em> → <strong>Consola</strong>).
                </li>
                <li>
                  Pega el código generado y presiona <kbd>Enter</kbd>.
                </li>
              </ol>
              <button
                type="button"
                className={`action-btn ${copiedCode ? "copied" : "secondary"}`}
                onClick={handleCopyScript}
              >
                {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                {copiedCode ? "¡Código Copiado!" : "Copiar Código para Consola"}
              </button>
            </div>
          </div>

          <div className="modal-tip-box">
            <Info size={16} />
            <span>
              Incluye tus ajustes actuales de velocidad (
              {preferences.baseDelayMs} ms), variación (±
              {preferences.variationMs} ms), pausas de puntuación y aviso con
              sonido y notificación al finalizar.
            </span>
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );
}
