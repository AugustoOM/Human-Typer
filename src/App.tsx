import { useEffect, useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { BrandMark } from "./components/BrandMark";
import { LanguagePicker } from "./components/LanguagePicker";
import { TextComposer } from "./components/TextComposer";
import { ThemePicker } from "./components/ThemePicker";
import { TypingSettings } from "./components/TypingSettings";
import { TypingStatusPanel } from "./components/TypingStatusPanel";
import { WebCompanionModal } from "./components/WebCompanionModal";
import { usePreferences } from "./hooks/usePreferences";
import { useTheme } from "./hooks/useTheme";
import { useTypingEngine } from "./hooks/useTypingEngine";
import { countCharacters, isActiveStatus } from "./lib/typing";
import { localizeNativeMessage, tr } from "./lib/i18n";
import "./App.css";

function App() {
  const [text, setText] = useState("");
  const [webCompanionOpen, setWebCompanionOpen] = useState(false);
  const { preferences, updatePreferences } = usePreferences();
  const {
    state,
    runtimeInfo,
    start,
    togglePause,
    cancel,
    requestAccessibility,
  } = useTypingEngine(preferences);
  useTheme(preferences.theme);
  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);

  const active = isActiveStatus(state.status);
  const textLength = countCharacters(text);
  const needsAccessibility =
    runtimeInfo?.platform === "macos" && !runtimeInfo.accessibilityGranted;
  const runtimeWarning =
    (runtimeInfo?.shortcutWarning
      ? localizeNativeMessage(runtimeInfo.shortcutWarning, preferences.language)
      : null) ??
    (needsAccessibility
      ? tr(
          preferences.language,
          "Allow access in Privacy & Security → Accessibility. Restart the app after enabling it.",
          "Permití el acceso en Privacidad y seguridad → Accesibilidad. Reiniciá la app después de activarlo.",
        )
      : null);
  const operationalState = active
    ? state.status === "paused"
      ? tr(preferences.language, "PAUSED", "EN PAUSA")
      : tr(preferences.language, "RUNNING", "EN CURSO")
    : state.status === "error"
      ? tr(preferences.language, "CHECK", "REVISAR")
      : tr(preferences.language, "READY", "LISTO");

  function beginTyping() {
    void start({
      text,
      baseDelayMs: preferences.baseDelayMs,
      variationMs: preferences.variationMs,
      countdownSeconds: preferences.countdownSeconds,
      punctuationPauses: preferences.punctuationPauses,
      pauseOnFocusLoss: preferences.pauseOnFocusLoss,
    });
  }

  return (
    <div className="app-frame">
      <aside
        className="app-rail"
        aria-label={tr(
          preferences.language,
          "App identity",
          "Identidad de la aplicación",
        )}
      >
        <BrandMark />
      </aside>

      <main className="app-shell">
        <header className="app-header">
          <h1>
            Human <span>Typer</span>
          </h1>
          <div className="header-controls">
            <LanguagePicker
              value={preferences.language}
              onChange={(language) => updatePreferences({ language })}
            />
            <ThemePicker
              value={preferences.theme}
              language={preferences.language}
              onChange={(theme) => updatePreferences({ theme })}
            />
            <div className="status-plate">
              <span>{tr(preferences.language, "Status", "Estado")}</span>
              <strong>{operationalState}</strong>
            </div>
          </div>
        </header>

        {runtimeWarning && (
          <div className="warning-banner" role="alert">
            <IconAlertTriangle size={18} />
            <div className="warning-content">
              <span>{runtimeWarning}</span>
              {needsAccessibility && (
                <button
                  className="warning-button"
                  type="button"
                  onClick={() => void requestAccessibility()}
                >
                  {tr(
                    preferences.language,
                    "Check permission",
                    "Comprobar permiso",
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="workspace-grid">
          <TextComposer
            text={text}
            disabled={active}
            language={preferences.language}
            onChange={setText}
            onClear={() => setText("")}
          />
          <TypingSettings
            preferences={preferences}
            disabled={active}
            focusGuardSupported={runtimeInfo?.focusGuardSupported ?? false}
            onChange={updatePreferences}
          />
        </div>

        <TypingStatusPanel
          state={state}
          language={preferences.language}
          textLength={textLength}
          delayMs={preferences.baseDelayMs}
          onStart={beginTyping}
          onTogglePause={() => void togglePause()}
          onCancel={() => void cancel()}
          onOpenWebCompanion={() => setWebCompanionOpen(true)}
        />

        <WebCompanionModal
          isOpen={webCompanionOpen}
          onClose={() => setWebCompanionOpen(false)}
          text={text}
          preferences={preferences}
        />
      </main>
    </div>
  );
}

export default App;
