import {
  IconBell,
  IconClock,
  IconFeather,
  IconGauge,
  IconKeyboard,
  IconLayoutNavbar,
  IconRunSprint,
  IconSparkles,
  IconVolume,
} from "@tabler/icons-react";
import { SPEED_PRESETS } from "../lib/typing";
import { tr } from "../lib/i18n";
import type { Preferences, SpeedPreset } from "../types";

interface TypingSettingsProps {
  preferences: Preferences;
  disabled: boolean;
  focusGuardSupported: boolean;
  onChange: (patch: Partial<Preferences>) => void;
}

export function TypingSettings({
  preferences,
  disabled,
  focusGuardSupported,
  onChange,
}: TypingSettingsProps) {
  const language = preferences.language;
  const speedLabels: Record<SpeedPreset, string> = {
    veryFast: tr(language, "Very fast", "Muy rápida"),
    fast: tr(language, "Fast", "Rápida"),
    normal: "Normal",
    slow: tr(language, "Slow", "Lenta"),
    verySlow: tr(language, "Very slow", "Muy lenta"),
    custom: tr(language, "Custom", "Manual"),
  };
  const speedIcons: Partial<Record<SpeedPreset, typeof IconKeyboard>> = {
    fast: IconRunSprint,
    normal: IconKeyboard,
    slow: IconFeather,
  };
  function selectPreset(preset: SpeedPreset) {
    const selected = SPEED_PRESETS[preset];
    onChange({
      speedPreset: preset,
      ...(selected.delay === null ? {} : { baseDelayMs: selected.delay }),
    });
  }

  return (
    <section className="card settings-card" aria-labelledby="settings-heading">
      <div className="section-heading settings-title">
        <h2 id="settings-heading">
          {tr(language, "Pace & Options", "Ritmo y opciones")}
        </h2>
      </div>

      <div className="setting-block full-width">
        <div className="setting-label-row">
          <label>{tr(language, "Speed", "Velocidad")}</label>
          <strong>{preferences.baseDelayMs} ms</strong>
        </div>
        <div
          className="preset-grid"
          role="group"
          aria-label={tr(language, "Speed preset", "Velocidad predefinida")}
        >
          {(Object.keys(SPEED_PRESETS) as SpeedPreset[]).map((preset) => {
            const SpeedIcon = speedIcons[preset];
            return (
              <button
                key={preset}
                className={
                  preferences.speedPreset === preset
                    ? "preset active"
                    : "preset"
                }
                type="button"
                onClick={() => selectPreset(preset)}
                disabled={disabled}
              >
                {SpeedIcon && <SpeedIcon size={15} aria-hidden="true" />}
                {speedLabels[preset]}
              </button>
            );
          })}
        </div>
        <input
          className="range"
          type="range"
          min="15"
          max="800"
          step="5"
          value={preferences.baseDelayMs}
          disabled={disabled}
          aria-label={tr(
            language,
            "Base speed in milliseconds",
            "Velocidad base en milisegundos",
          )}
          onChange={(event) =>
            onChange({
              baseDelayMs: Number(event.currentTarget.value),
              speedPreset: "custom",
            })
          }
        />
        <div className="range-labels">
          <span>{tr(language, "Faster", "Más rápida")}</span>
          <span>{tr(language, "Slower", "Más lenta")}</span>
        </div>
      </div>

      <div className="settings-grid">
        <div className="setting-panel">
          <div className="panel-icon">
            <IconSparkles size={18} />
          </div>
          <div className="panel-content">
            <div className="setting-label-row">
              <label htmlFor="variation">
                {tr(language, "Variation", "Variación")}
              </label>
              <strong>±{preferences.variationMs} ms</strong>
            </div>
            <input
              id="variation"
              className="range"
              type="range"
              min="0"
              max="120"
              step="5"
              value={preferences.variationMs}
              disabled={disabled}
              onChange={(event) =>
                onChange({ variationMs: Number(event.currentTarget.value) })
              }
            />
          </div>
        </div>

        <div className="setting-panel">
          <div className="panel-icon">
            <IconClock size={18} />
          </div>
          <div className="panel-content">
            <div className="setting-label-row">
              <label htmlFor="countdown">
                {tr(language, "Countdown", "Espera")}
              </label>
              <strong>{preferences.countdownSeconds} s</strong>
            </div>
            <input
              id="countdown"
              className="range"
              type="range"
              min="1"
              max="30"
              step="1"
              value={preferences.countdownSeconds}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  countdownSeconds: Number(event.currentTarget.value),
                })
              }
            />
          </div>
        </div>
      </div>

      <label className={disabled ? "toggle-row disabled" : "toggle-row"}>
        <span className="panel-icon">
          <IconGauge size={18} />
        </span>
        <span className="toggle-copy">
          <strong>
            {tr(language, "Punctuation pauses", "Pausas de puntuación")}
          </strong>
          <small>
            {tr(
              language,
              "Natural pauses after periods, commas, and line breaks",
              "Pausas naturales en puntos, comas y saltos de línea",
            )}
          </small>
        </span>
        <input
          type="checkbox"
          checked={preferences.punctuationPauses}
          disabled={disabled}
          onChange={(event) =>
            onChange({ punctuationPauses: event.currentTarget.checked })
          }
        />
        <span className="switch" aria-hidden="true" />
      </label>

      <label className={disabled ? "toggle-row disabled" : "toggle-row"}>
        <span className="panel-icon">
          <IconKeyboard size={18} />
        </span>
        <span className="toggle-copy">
          <strong>{tr(language, "Typing mistakes", "Errores de tipeo")}</strong>
          <small>
            {tr(
              language,
              "Occasionally presses a nearby key, deletes it, and types the correct letter",
              "A veces pulsa una tecla cercana, la borra y escribe la letra correcta",
            )}
          </small>
        </span>
        <input
          type="checkbox"
          checked={preferences.typingMistakes}
          disabled={disabled}
          onChange={(event) =>
            onChange({ typingMistakes: event.currentTarget.checked })
          }
        />
        <span className="switch" aria-hidden="true" />
      </label>

      <label
        className={
          disabled || !focusGuardSupported
            ? "toggle-row disabled"
            : "toggle-row"
        }
      >
        <span className="panel-icon">
          <IconLayoutNavbar size={18} />
        </span>
        <span className="toggle-copy">
          <strong>
            {tr(language, "Protect target window", "Proteger ventana objetivo")}
          </strong>
          <small>
            {focusGuardSupported
              ? tr(
                  language,
                  "Pauses when another window receives focus",
                  "Pausa si otra ventana recibe el foco",
                )
              : tr(
                  language,
                  "Available on macOS and Windows",
                  "Disponible en macOS y Windows",
                )}
          </small>
        </span>
        <input
          type="checkbox"
          checked={preferences.pauseOnFocusLoss}
          disabled={disabled || !focusGuardSupported}
          onChange={(event) =>
            onChange({ pauseOnFocusLoss: event.currentTarget.checked })
          }
        />
        <span className="switch" aria-hidden="true" />
      </label>

      <div className="settings-subgrid">
        <label
          className={
            disabled ? "toggle-row compact disabled" : "toggle-row compact"
          }
        >
          <span className="panel-icon">
            <IconVolume size={18} />
          </span>
          <span className="toggle-copy">
            <strong>
              {tr(language, "Completion sound", "Sonido al finalizar")}
            </strong>
          </span>
          <input
            type="checkbox"
            checked={preferences.soundNotification}
            disabled={disabled}
            onChange={(event) =>
              onChange({ soundNotification: event.currentTarget.checked })
            }
          />
          <span className="switch" aria-hidden="true" />
        </label>

        <label
          className={
            disabled ? "toggle-row compact disabled" : "toggle-row compact"
          }
        >
          <span className="panel-icon">
            <IconBell size={18} />
          </span>
          <span className="toggle-copy">
            <strong>
              {tr(
                language,
                "Completion notification",
                "Notificación al terminar",
              )}
            </strong>
          </span>
          <input
            type="checkbox"
            checked={preferences.desktopNotification}
            disabled={disabled}
            onChange={(event) =>
              onChange({ desktopNotification: event.currentTarget.checked })
            }
          />
          <span className="switch" aria-hidden="true" />
        </label>
      </div>
    </section>
  );
}
