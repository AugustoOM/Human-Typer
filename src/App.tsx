import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BrandMark } from "./components/BrandMark";
import { TextComposer } from "./components/TextComposer";
import { ThemePicker } from "./components/ThemePicker";
import { TypingSettings } from "./components/TypingSettings";
import { TypingStatusPanel } from "./components/TypingStatusPanel";
import { WebCompanionModal } from "./components/WebCompanionModal";
import { usePreferences } from "./hooks/usePreferences";
import { useTheme } from "./hooks/useTheme";
import { useTypingEngine } from "./hooks/useTypingEngine";
import { countCharacters, isActiveStatus } from "./lib/typing";
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

  const active = isActiveStatus(state.status);
  const textLength = countCharacters(text);
  const needsAccessibility =
    runtimeInfo?.platform === "macos" && !runtimeInfo.accessibilityGranted;
  const runtimeWarning =
    runtimeInfo?.shortcutWarning ??
    (needsAccessibility
      ? "Allow access in Privacy & Security → Accessibility. Restart the app after enabling it."
      : null);
  const operationalState = active
    ? state.status === "paused"
      ? "PAUSED"
      : "RUNNING"
    : state.status === "error"
      ? "CHECK"
      : "READY";

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
      <aside className="app-rail" aria-label="App identity">
        <BrandMark />
      </aside>

      <main className="app-shell">
        <header className="app-header">
          <h1>
            Human <span>Typer</span>
          </h1>
          <div className="header-controls">
            <ThemePicker
              value={preferences.theme}
              onChange={(theme) => updatePreferences({ theme })}
            />
            <div className="status-plate">
              <span>Status</span>
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
                  Check permission
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
            focusGuardSupported={runtimeInfo?.focusGuardSupported ?? false}
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
