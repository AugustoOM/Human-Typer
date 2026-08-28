import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BrandMark } from "./components/BrandMark";
import { TextComposer } from "./components/TextComposer";
import { ThemePicker } from "./components/ThemePicker";
import { TypingSettings } from "./components/TypingSettings";
import { TypingStatusPanel } from "./components/TypingStatusPanel";
import { usePreferences } from "./hooks/usePreferences";
import { useTheme } from "./hooks/useTheme";
import { useTypingEngine } from "./hooks/useTypingEngine";
import { countCharacters, isActiveStatus } from "./lib/typing";
import "./App.css";

function App() {
  const [text, setText] = useState("");
  const { preferences, updatePreferences } = usePreferences();
  const {
    state,
    runtimeInfo,
    start,
    togglePause,
    cancel,
    requestAccessibility,
  } = useTypingEngine();
  useTheme(preferences.theme);

  const active = isActiveStatus(state.status);
  const textLength = countCharacters(text);
  const needsAccessibility =
    runtimeInfo?.platform === "macos" && !runtimeInfo.accessibilityGranted;
  const runtimeWarning =
    runtimeInfo?.shortcutWarning ??
    (needsAccessibility
      ? "Para escribir en otras aplicaciones, habilitá Human Typer en Configuración del Sistema → Privacidad y seguridad → Accesibilidad. Si ya está activado, cerrá y volvé a abrir la app."
      : null);
  const operationalState = active
    ? state.status === "paused"
      ? "EN PAUSA"
      : "EN CURSO"
    : state.status === "error"
      ? "REVISAR"
      : "OPERATIVO";

  function beginTyping() {
    void start({
      text,
      baseDelayMs: preferences.baseDelayMs,
      variationMs: preferences.variationMs,
      countdownSeconds: preferences.countdownSeconds,
      punctuationPauses: preferences.punctuationPauses,
    });
  }

  return (
    <div className="app-frame">
      <aside className="app-rail" aria-label="Identificación de la estación">
        <div className="rail-brand">
          <BrandMark />
          <span>Human Typer</span>
        </div>
        <strong>HT</strong>
        <small>TYPE-LAB / LOCAL</small>
      </aside>

      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="stamp">
              Estación de escritura / automatización local
            </p>
            <h1>
              Human <span>Typer</span>
            </h1>
            <p className="header-deck">
              Convertí cualquier texto en pulsaciones reales, con un ritmo
              natural y bajo tu control.
            </p>
          </div>
          <div className="header-controls">
            <ThemePicker
              value={preferences.theme}
              onChange={(theme) => updatePreferences({ theme })}
            />
            <div className="status-plate">
              <span>Estado</span>
              <strong>{operationalState}</strong>
            </div>
          </div>
        </header>

        {runtimeWarning && (
          <div className="warning-banner" role="alert">
            <AlertTriangle size={18} />
            <div className="warning-content">
              <span>{runtimeWarning}</span>
              {needsAccessibility && (
                <button
                  className="warning-button"
                  type="button"
                  onClick={() => void requestAccessibility()}
                >
                  Solicitar / comprobar permiso
                </button>
              )}
            </div>
          </div>
        )}

        <div className="workspace-grid">
          <TextComposer
            text={text}
            disabled={active}
            onChange={setText}
            onClear={() => setText("")}
          />
          <TypingSettings
            preferences={preferences}
            disabled={active}
            onChange={updatePreferences}
          />
        </div>

        <TypingStatusPanel
          state={state}
          textLength={textLength}
          delayMs={preferences.baseDelayMs}
          onStart={beginTyping}
          onTogglePause={() => void togglePause()}
          onCancel={() => void cancel()}
        />

        <footer>
          <span>100% local · El contenido no se guarda ni se envía</span>
          <span className="platform-note">
            <kbd>F8</kbd> pausa / reanuda · <kbd>Esc</kbd> detiene
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
