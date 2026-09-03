import {
  IconAlertTriangle,
  IconCircleCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconSquareRoundedX,
  IconWorld,
} from "@tabler/icons-react";
import { calculateProgress, estimateDuration } from "../lib/typing";
import { localizeNativeMessage, tr } from "../lib/i18n";
import type { LanguagePreference, TypingState } from "../types";

interface TypingStatusPanelProps {
  state: TypingState;
  language: LanguagePreference;
  textLength: number;
  delayMs: number;
  onStart: () => void;
  onTogglePause: () => void;
  onCancel: () => void;
  onOpenWebCompanion: () => void;
}

export function TypingStatusPanel({
  state,
  language,
  textLength,
  delayMs,
  onStart,
  onTogglePause,
  onCancel,
  onOpenWebCompanion,
}: TypingStatusPanelProps) {
  const statusLabels = {
    idle: tr(language, "Ready", "Listo"),
    countdown: tr(language, "Preparing", "Preparando"),
    typing: tr(language, "Typing", "Escribiendo"),
    paused: tr(language, "Paused", "En pausa"),
    completed: tr(language, "Completed", "Completado"),
    cancelled: tr(language, "Cancelled", "Cancelado"),
    error: tr(language, "Needs attention", "Necesita atención"),
  } as const;
  const active =
    state.status === "countdown" ||
    state.status === "typing" ||
    state.status === "paused";
  const canPause = state.status === "typing" || state.status === "paused";
  const progress = calculateProgress(state.current, state.total || textLength);

  return (
    <section
      className={`status-card status-${state.status}`}
      aria-label={tr(language, "Typing controls", "Controles de escritura")}
      aria-live="polite"
    >
      <div className="status-main">
        <div className="status-copy">
          <span className="status-dot" />
          <div>
            <span className="status-label">{statusLabels[state.status]}</span>
            {state.status === "countdown" ? (
              <strong className="countdown-copy">
                {tr(language, "Starting in", "Comenzando en")}{" "}
                {state.countdown ?? "…"}
              </strong>
            ) : state.status === "typing" || state.status === "paused" ? (
              <strong>
                {tr(language, "Typing", "Escribiendo")}{" "}
                {state.current.toLocaleString(language)} /{" "}
                {state.total.toLocaleString(language)}{" "}
                {tr(language, "characters", "caracteres")}
              </strong>
            ) : (
              <strong>
                {textLength
                  ? `${textLength.toLocaleString(language)} ${tr(language, "characters", "caracteres")} · ${estimateDuration(textLength, delayMs)}`
                  : tr(
                      language,
                      "Paste some text to get started",
                      "Pegá un texto para empezar",
                    )}
              </strong>
            )}
          </div>
        </div>
        <span className="progress-percent">{progress}%</span>
      </div>

      <div
        className="progress-track"
        aria-label={`${tr(language, "Progress", "Progreso")} ${progress}%`}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      {state.message && (
        <div
          className={
            state.status === "error"
              ? "state-message error"
              : state.status === "paused"
                ? "state-message attention"
                : "state-message"
          }
        >
          {state.status === "error" ? (
            <IconAlertTriangle size={16} />
          ) : state.status === "paused" ? (
            <IconPlayerPause size={16} />
          ) : (
            <IconCircleCheck size={16} />
          )}
          {localizeNativeMessage(state.message, language)}
        </div>
      )}

      <div className="action-row">
        <button
          className="button primary"
          type="button"
          onClick={onStart}
          disabled={!textLength || active}
          title={tr(
            language,
            "Type in the active window using native keyboard input",
            "Escribir en la ventana activa con teclado nativo",
          )}
        >
          {state.status === "completed" || state.status === "cancelled" ? (
            <IconRefresh size={18} />
          ) : (
            <IconPlayerPlay size={18} fill="currentColor" />
          )}
          {state.status === "completed" || state.status === "cancelled"
            ? tr(language, "Type again", "Escribir de nuevo")
            : tr(language, "Start (Desktop)", "Comenzar (Escritorio)")}
        </button>

        <button
          className="button accent-bg"
          type="button"
          onClick={onOpenWebCompanion}
          disabled={!textLength}
          title={tr(
            language,
            "Type in the background in Google Docs, Word Online, or any website while you browse or watch videos",
            "Escribir en segundo plano en Google Docs, Word Online o cualquier web mientras navegás o mirás videos",
          )}
        >
          <IconWorld size={18} />
          {tr(
            language,
            "Background Mode (Docs / Web)",
            "Segundo plano (Docs / Web)",
          )}
        </button>

        <button
          className="button secondary"
          type="button"
          onClick={onTogglePause}
          disabled={!canPause}
        >
          {state.status === "paused" ? (
            <IconPlayerPlay size={18} />
          ) : (
            <IconPlayerPause size={18} fill="currentColor" />
          )}
          {state.status === "paused"
            ? tr(language, "Resume", "Reanudar")
            : tr(language, "Pause", "Pausar")}
          <kbd>F8</kbd>
        </button>
        <button
          className="button danger"
          type="button"
          onClick={onCancel}
          disabled={!active}
        >
          <IconSquareRoundedX size={18} />
          {tr(language, "Cancel", "Cancelar")}
          <kbd>Esc</kbd>
        </button>
      </div>
    </section>
  );
}
