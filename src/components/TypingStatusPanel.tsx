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
  onOpenWebCompanion: () => void;
}

const statusLabels = {
  idle: "Ready",
  countdown: "Preparing",
  typing: "Typing",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  error: "Needs attention",
} as const;

export function TypingStatusPanel({
  state,
  textLength,
  delayMs,
  onStart,
  onTogglePause,
  onCancel,
  onOpenWebCompanion,
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
      aria-label="Typing controls"
      aria-live="polite"
    >
      <div className="status-main">
        <div className="status-copy">
          <span className="status-dot" />
          <div>
            <span className="status-label">{statusLabels[state.status]}</span>
            {state.status === "countdown" ? (
              <strong className="countdown-copy">
                Starting in {state.countdown ?? "…"}
              </strong>
            ) : state.status === "typing" || state.status === "paused" ? (
              <strong>
                Typing {state.current.toLocaleString("en")} /{" "}
                {state.total.toLocaleString("en")} characters
              </strong>
            ) : (
              <strong>
                {textLength
                  ? `${textLength.toLocaleString("en")} characters · ${estimateDuration(textLength, delayMs)}`
                  : "Paste some text to get started"}
              </strong>
            )}
          </div>
        </div>
        <span className="progress-percent">{progress}%</span>
      </div>

      <div className="progress-track" aria-label={`Progress ${progress}%`}>
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
            <AlertTriangle size={16} />
          ) : state.status === "paused" ? (
            <Pause size={16} />
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
          title="Type in the active window using native keyboard input"
        >
          {state.status === "completed" || state.status === "cancelled" ? (
            <RotateCcw size={18} />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          {state.status === "completed" || state.status === "cancelled"
            ? "Type again"
            : "Start (Desktop)"}
        </button>

        <button
          className="button accent-bg"
          type="button"
          onClick={onOpenWebCompanion}
          disabled={!textLength}
          title="Type in the background in Google Docs, Word Online, or any website while you browse or watch videos"
        >
          <span className="spark-icon">⚡</span>
          Background Mode (Docs / Web)
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
          {state.status === "paused" ? "Resume" : "Pause"}
          <kbd>F8</kbd>
        </button>
        <button
          className="button danger"
          type="button"
          onClick={onCancel}
          disabled={!active}
        >
          <CircleStop size={18} />
          Cancel
          <kbd>Esc</kbd>
        </button>
      </div>
    </section>
  );
}
