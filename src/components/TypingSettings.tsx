import { Clock3, Gauge, Sparkles } from "lucide-react";
import { SPEED_PRESETS } from "../lib/typing";
import type { Preferences, SpeedPreset } from "../types";

interface TypingSettingsProps {
  preferences: Preferences;
  disabled: boolean;
  onChange: (patch: Partial<Preferences>) => void;
}

export function TypingSettings({
  preferences,
  disabled,
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
        <div>
          <span className="eyebrow">COMPORTAMIENTO</span>
          <h2 id="settings-heading">Ritmo de escritura</h2>
        </div>
        <span className="settings-summary">
          Natural, con pequeñas variaciones
        </span>
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
            <p>Evita un ritmo mecánico entre teclas.</p>
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
              <label htmlFor="countdown">Cuenta regresiva</label>
              <strong>{preferences.countdownSeconds} s</strong>
            </div>
            <p>Tiempo para enfocar el campo de destino.</p>
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
          <strong>Pausas después de puntuación</strong>
          <small>
            Agrega una pausa natural tras comas, puntos, signos y saltos de
            línea.
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
    </section>
  );
}
