import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
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
  const { state, runtimeInfo, start, togglePause, cancel } = useTypingEngine();
  useTheme(preferences.theme);

  const active = isActiveStatus(state.status);
  const textLength = countCharacters(text);
  const runtimeWarning =
    runtimeInfo?.shortcutWarning ??
    (runtimeInfo?.platform === "macos" && !runtimeInfo.accessibilityGranted
      ? "Para escribir en otras aplicaciones, habilitá Human Typer en Configuración del Sistema → Privacidad y seguridad → Accesibilidad."
      : null);

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
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <BrandMark />
          <div>
            <h1>Human Typer</h1>
            <p>Escritura natural, a tu ritmo.</p>
          </div>
        </div>
        <ThemePicker
          value={preferences.theme}
          onChange={(theme) => updatePreferences({ theme })}
        />
      </header>

      <div className="intro-row">
        <div>
          <h2>Convertí cualquier texto en pulsaciones reales.</h2>
          <p>
            Prepará el contenido, elegí el ritmo y enfocá el campo de destino
            durante la cuenta regresiva.
          </p>
        </div>
        <div className="offline-badge">
          <ShieldCheck size={16} /> 100% local
        </div>
      </div>

      {runtimeWarning && (
        <div className="warning-banner" role="alert">
          <AlertTriangle size={18} />
          <span>{runtimeWarning}</span>
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
        <span>Human Typer no guarda ni envía tu contenido.</span>
        <span className="platform-note">
          Atajos globales: <kbd>F8</kbd> pausa · <kbd>Esc</kbd> detiene
        </span>
      </footer>
    </main>
  );
}

export default App;
