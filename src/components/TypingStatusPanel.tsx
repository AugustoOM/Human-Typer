import {
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { calculateProgress, estimateDuration } from "../lib/typing";
import type { TypingState } from "../types";

interface TypingStatusPanelProps {
  state: TypingState;
  textLength: number;
  delayMs: number;
  onStart: () => void;
  onTogglePause: () => void;
  onCancel: () => void;
}

const statusLabels = {
  idle: "Listo para comenzar",
  countdown: "Preparando escritura",
  typing: "Escribiendo",
  paused: "En pausa",
  completed: "Completado",
  cancelled: "Cancelado",
  error: "Necesita atención",
} as const;

export function TypingStatusPanel({
  state,
  textLength,
  delayMs,
  onStart,
  onTogglePause,
  onCancel,
}: TypingStatusPanelProps) {
  const active =
    state.status === "countdown" ||
    state.status === "typing" ||
    state.status === "paused";
  const canPause = state.status === "typing" || state.status === "paused";
  const progress = calculateProgress(state.current, state.total || textLength);

  return (
    <section
      className={`status-card status-${state.status}`}
      aria-live="polite"
    >
      <div className="status-main">
        <div className="status-copy">
          <span className="status-dot" />
          <div>
            <span className="status-label">{statusLabels[state.status]}</span>
            {state.status === "countdown" ? (
              <strong className="countdown-copy">
                Comenzando en {state.countdown ?? "…"}
              </strong>
            ) : state.status === "typing" || state.status === "paused" ? (
              <strong>
                Escribiendo {state.current.toLocaleString("es")} /{" "}
                {state.total.toLocaleString("es")} caracteres
              </strong>
            ) : (
              <strong>
                {textLength
                  ? `${textLength.toLocaleString("es")} caracteres · ${estimateDuration(textLength, delayMs)}`
                  : "Pegá un texto para empezar"}
              </strong>
            )}
          </div>
        </div>
        <span className="progress-percent">{progress}%</span>
      </div>

      <div className="progress-track" aria-label={`Progreso ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {state.message && (
        <div
          className={
            state.status === "error" ? "state-message error" : "state-message"
          }
        >
          {state.status === "error" ? (
            <AlertTriangle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          {state.message}
        </div>
      )}

      <div className="action-row">
        <button
          className="button primary"
          type="button"
          onClick={onStart}
          disabled={!textLength || active}
        >
          {state.status === "completed" || state.status === "cancelled" ? (
            <RotateCcw size={18} />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          {state.status === "completed" || state.status === "cancelled"
            ? "Escribir de nuevo"
            : "Comenzar"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={onTogglePause}
          disabled={!canPause}
        >
          {state.status === "paused" ? (
            <Play size={18} />
          ) : (
            <Pause size={18} fill="currentColor" />
          )}
          {state.status === "paused" ? "Reanudar" : "Pausar"}
          <kbd>F8</kbd>
        </button>
        <button
          className="button danger"
          type="button"
          onClick={onCancel}
          disabled={!active}
        >
          <CircleStop size={18} />
          Cancelar
          <kbd>Esc</kbd>
        </button>
      </div>
    </section>
  );
}
