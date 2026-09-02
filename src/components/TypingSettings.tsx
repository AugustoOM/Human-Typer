import { Bell, Clock3, Gauge, PanelsTopLeft, Sparkles, Volume2 } from "lucide-react";
import { SPEED_PRESETS } from "../lib/typing";
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
        <h2 id="settings-heading">Ritmo y Opciones</h2>
      </div>

      <div className="setting-block full-width">
        <div className="setting-label-row">
          <label>Velocidad</label>
          <strong>{preferences.baseDelayMs} ms</strong>
        </div>
        <div
          className="preset-grid"
          role="group"
          aria-label="Velocidad predefinida"
        >
          {(Object.keys(SPEED_PRESETS) as SpeedPreset[]).map((preset) => (
            <button
              key={preset}
              className={
                preferences.speedPreset === preset ? "preset active" : "preset"
              }
              type="button"
              onClick={() => selectPreset(preset)}
              disabled={disabled}
            >
              {SPEED_PRESETS[preset].label}
            </button>
          ))}
        </div>
        <input
          className="range"
          type="range"
          min="15"
          max="350"
          step="5"
          value={preferences.baseDelayMs}
          disabled={disabled}
          aria-label="Velocidad base en milisegundos"
          onChange={(event) =>
            onChange({
              baseDelayMs: Number(event.currentTarget.value),
              speedPreset: "custom",
            })
          }
        />
        <div className="range-labels">
          <span>Más rápida</span>
          <span>Más lenta</span>
        </div>
      </div>

      <div className="settings-grid">
        <div className="setting-panel">
          <div className="panel-icon">
            <Sparkles size={18} />
          </div>
          <div className="panel-content">
            <div className="setting-label-row">
              <label htmlFor="variation">Variación</label>
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
            <Clock3 size={18} />
          </div>
          <div className="panel-content">
            <div className="setting-label-row">
              <label htmlFor="countdown">Espera</label>
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
          <Gauge size={18} />
        </span>
        <span className="toggle-copy">
          <strong>Pausas de puntuación</strong>
          <small>Pausas naturales en puntos, comas y saltos de línea</small>
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

      <label
        className={
          disabled || !focusGuardSupported
            ? "toggle-row disabled"
            : "toggle-row"
        }
      >
        <span className="panel-icon">
          <PanelsTopLeft size={18} />
        </span>
        <span className="toggle-copy">
          <strong>Proteger ventana objetivo</strong>
          <small>
            {focusGuardSupported
              ? "Pausa si otra ventana recibe el foco"
              : "Disponible en macOS y Windows"}
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
        <label className={disabled ? "toggle-row compact disabled" : "toggle-row compact"}>
          <span className="panel-icon">
            <Volume2 size={18} />
          </span>
          <span className="toggle-copy">
            <strong>Sonido al finalizar</strong>
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

        <label className={disabled ? "toggle-row compact disabled" : "toggle-row compact"}>
          <span className="panel-icon">
            <Bell size={18} />
          </span>
          <span className="toggle-copy">
            <strong>Notificación al terminar</strong>
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
