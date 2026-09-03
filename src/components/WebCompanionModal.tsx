import { useEffect, useState } from "react";
import { join, resourceDir } from "@tauri-apps/api/path";
import { Check, Copy, Download, Info, Sparkles, X, Zap } from "lucide-react";
import { downloadExtensionZip } from "../lib/extensionPacker";
import { generateWebCompanionScript } from "../lib/webCompanion";
import type { Preferences } from "../types";

interface WebCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  preferences: Preferences;
}

export function WebCompanionModal({
  isOpen,
  onClose,
  text,
  preferences,
}: WebCompanionModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedExtensionPath, setCopiedExtensionPath] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);
  const [extensionPath, setExtensionPath] = useState("chrome-extension");

  useEffect(() => {
    if (!isOpen) return;

    void (async () => {
      try {
        setExtensionPath(await join(await resourceDir(), "chrome-extension"));
      } catch {
        setExtensionPath("chrome-extension");
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const scriptCode = generateWebCompanionScript({
    text: text || "Sample text for Human Typer...",
    baseDelayMs: preferences.baseDelayMs,
    variationMs: preferences.variationMs,
    punctuationPauses: preferences.punctuationPauses,
    notifyOnComplete: preferences.desktopNotification,
  });

  function handleCopyScript() {
    navigator.clipboard.writeText(scriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  }

  function handleCopyExtensionPath() {
    void navigator.clipboard.writeText(extensionPath);
    setCopiedExtensionPath(true);
    setTimeout(() => setCopiedExtensionPath(false), 2500);
  }

  function handleDownloadZip() {
    downloadExtensionZip();
    setDownloadedZip(true);
    setTimeout(() => setDownloadedZip(false), 2500);
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="web-modal-title"
      >
        <header className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <Zap size={20} />
            </div>
            <div>
              <h3 id="web-modal-title">
                Background Typing (Google Docs / Web / Word Online)
              </h3>
              <p className="modal-subtitle">
                Keep typing in your web document while watching videos or
                browsing other tabs.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="feature-banner">
            <Sparkles size={20} className="feature-icon" />
            <div>
              <strong>100% Focus Independent</strong>
              <p>
                This method injects human-paced typing directly into the
                document. You can switch windows, watch YouTube in full screen,
                or play without interruptions or interference with your
                keyboard.
              </p>
            </div>
          </div>

          <div className="methods-grid">
            <div className="method-card">
              <div className="method-header">
                <div className="step-badge">Recommended · One Click</div>
                <h4>Extension for Chrome, Edge, and Firefox</h4>
              </div>
              <p className="method-desc">
                Adds a permanent ⚡ button to your browser for Google Docs and
                any website:
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  margin: "10px 0 16px",
                }}
              >
                <button
                  type="button"
                  className={`action-btn ${downloadedZip ? "copied" : "primary"}`}
                  onClick={handleDownloadZip}
                >
                  {downloadedZip ? <Check size={18} /> : <Download size={18} />}
                  {downloadedZip
                    ? "Extension Downloaded!"
                    : "Download Extension (.ZIP)"}
                </button>
              </div>

              <ol className="step-list">
                <li>
                  Open <strong>chrome://extensions</strong>, or Firefox's{" "}
                  <strong>about:debugging</strong> page.
                </li>
                <li>
                  Enable <strong>"Developer mode"</strong> (top right).
                </li>
                <li>
                  Click <strong>"Load unpacked"</strong> and select the
                  extracted extension folder.
                </li>
              </ol>
              <button
                type="button"
                className={`action-btn ${copiedExtensionPath ? "copied" : "primary"}`}
                onClick={handleCopyExtensionPath}
              >
                {copiedExtensionPath ? <Check size={18} /> : <Copy size={18} />}
                {copiedExtensionPath
                  ? "Folder Path Copied!"
                  : "Copy Extension Folder Path"}
              </button>
            </div>

            <div className="method-card">
              <div className="method-header">
                <div className="step-badge">Alternative · No Installation</div>
                <h4>
                  Paste into Console (<kbd>F12</kbd>)
                </h4>
              </div>
              <p className="method-desc">
                Type instantly in any active tab without installing anything:
              </p>
              <ol className="step-list">
                <li>
                  Open your <strong>Google Docs</strong> document.
                </li>
                <li>
                  Press <kbd>F12</kbd> (or right-click → <em>Inspect</em> →{" "}
                  <strong>Console</strong>).
                </li>
                <li>
                  Paste the generated code and press <kbd>Enter</kbd>.
                </li>
              </ol>
              <button
                type="button"
                className={`action-btn ${copiedCode ? "copied" : "secondary"}`}
                onClick={handleCopyScript}
              >
                {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                {copiedCode ? "Code Copied!" : "Copy Code for Console"}
              </button>
            </div>
          </div>

          <div className="modal-tip-box">
            <Info size={16} />
            <span>
              Includes your current speed ({preferences.baseDelayMs} ms),
              variation (±{preferences.variationMs} ms), punctuation pauses, and
              sound and desktop notifications on completion.
            </span>
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}
