import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { tr } from "../lib/i18n";
import type { LanguagePreference } from "../types";
import type { BrowserBridgeState } from "../hooks/useBrowserBridge";
interface Props {
  state: BrowserBridgeState | null;
  error: string;
  language: LanguagePreference;
  disabled: boolean;
  hasText: boolean;
  onSend: (id: number) => void;
  onControl: (action: "start" | "pause" | "cancel") => void;
}
export function BrowserBridgePanel({
  state,
  error,
  language,
  disabled,
  hasText,
  onSend,
  onControl,
}: Props) {
  const [tabId, setTabId] = useState(0);
  const [copied, setCopied] = useState(false);
  const tabs =
    state?.tabs.filter((tab) =>
      tab.url.startsWith("https://docs.google.com/document/"),
    ) ?? [];
  const chosen = tabs.some((tab) => tab.id === tabId)
    ? tabId
    : (tabs[0]?.id ?? 0);
  const busy = ["sent", "prepared", "countdown", "typing", "paused"].includes(
    state?.job?.status ?? "",
  );
  const labels: Record<string, string> = {
    sent: tr(language, "Sent", "Enviado"),
    prepared: tr(language, "Ready to start", "Listo para comenzar"),
    countdown: tr(language, "Countdown", "Cuenta regresiva"),
    typing: tr(language, "Typing", "Escribiendo"),
    paused: tr(language, "Paused", "En pausa"),
    completed: tr(language, "Completed", "Completado"),
    cancelled: tr(language, "Cancelled", "Cancelado"),
    error: tr(language, "Error", "Error"),
  };
  return (
    <section
      className="card spreadsheet-card"
      aria-labelledby="browser-bridge-heading"
    >
      <div className="section-heading">
        <h2 id="browser-bridge-heading">
          {tr(language, "Send to browser", "Enviar al navegador")}
        </h2>
        <span>
          {state?.connected
            ? tr(language, "Connected", "Conectado")
            : tr(language, "Disconnected", "Desconectado")}
        </span>
      </div>
      {!isTauri() ? (
        <p>
          {tr(
            language,
            "Open the desktop app to connect the browser extension.",
            "Abrí la app de escritorio para conectar la extensión.",
          )}
        </p>
      ) : (
        <>
          {!state?.connected && (
            <>
              <p className="document-hint">
                {tr(
                  language,
                  "Open the updated extension, paste this connection code and choose Connect. The connection stays local and expires when the app closes.",
                  "Abrí la extensión actualizada, pegá este código de conexión y elegí Conectar. La conexión es local y vence al cerrar la app.",
                )}
              </p>
              <button
                className="icon-text-button"
                disabled={!state?.pairingCode}
                onClick={async () => {
                  await navigator.clipboard.writeText(state?.pairingCode ?? "");
                  setCopied(true);
                }}
              >
                {copied
                  ? tr(language, "Code copied", "Código copiado")
                  : tr(
                      language,
                      "Copy connection code",
                      "Copiar código de conexión",
                    )}
              </button>
            </>
          )}
          {state?.connected && (
            <div className="document-controls">
              <select
                aria-label={tr(
                  language,
                  "Destination document",
                  "Documento de destino",
                )}
                value={chosen}
                disabled={disabled || busy}
                onChange={(e) => setTabId(Number(e.target.value))}
              >
                <option value={0}>
                  {tr(
                    language,
                    "Choose a Google Docs tab",
                    "Elegí una pestaña de Google Docs",
                  )}
                </option>
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.title}
                  </option>
                ))}
              </select>
              <button
                className="button secondary"
                disabled={disabled || busy || !hasText || !chosen}
                onClick={() => onSend(chosen)}
              >
                {tr(
                  language,
                  "Send text and formatting",
                  "Enviar texto y formato",
                )}
              </button>
            </div>
          )}
          {state?.job && (
            <div role="status">
              <p>
                {labels[state.job.status] ?? state.job.status} ·{" "}
                {state.job.current} / {state.job.total}
              </p>
              <div className="document-controls">
                <button
                  className="icon-text-button"
                  disabled={
                    disabled ||
                    !state.connected ||
                    state.job.status !== "prepared"
                  }
                  onClick={() => onControl("start")}
                >
                  {tr(language, "Start in document", "Comenzar en documento")}
                </button>
                <button
                  className="icon-text-button"
                  disabled={
                    disabled ||
                    !state.connected ||
                    !["typing", "paused"].includes(state.job.status)
                  }
                  onClick={() => onControl("pause")}
                >
                  {state.job.status === "paused"
                    ? tr(language, "Resume", "Reanudar")
                    : tr(language, "Pause", "Pausar")}
                </button>
                <button
                  className="icon-text-button"
                  disabled={disabled || !state.connected || !busy}
                  onClick={() => onControl("cancel")}
                >
                  {tr(language, "Cancel", "Cancelar")}
                </button>
              </div>
              {state.job.message && (
                <p className="spreadsheet-error">{state.job.message}</p>
              )}
            </div>
          )}
        </>
      )}
      <p className="document-hint">
        {tr(
          language,
          "Text is prepared in the chosen tab before you start. Background formatting may be limited by Google Docs. Sheets transfer will use the upcoming API integration.",
          "El texto se prepara en la pestaña elegida antes de comenzar. Google Docs puede limitar el formato en segundo plano. La transferencia a Sheets se incorporará mediante su API.",
        )}
      </p>
      {(error || state?.error) && (
        <p className="spreadsheet-error" role="alert">
          {error || state?.error}
        </p>
      )}
    </section>
  );
}
