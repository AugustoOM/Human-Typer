import { Eraser } from "lucide-react";
import { countCharacters } from "../lib/typing";
import { tr } from "../lib/i18n";
import type { LanguagePreference } from "../types";

interface TextComposerProps {
  text: string;
  disabled: boolean;
  language: LanguagePreference;
  onChange: (text: string) => void;
  onClear: () => void;
}

export function TextComposer({
  text,
  disabled,
  language,
  onChange,
  onClear,
}: TextComposerProps) {
  return (
    <section className="card composer-card" aria-labelledby="text-heading">
      <div className="section-heading">
        <h2 id="text-heading">{tr(language, "Text", "Texto")}</h2>
        <div className="composer-actions">
          <span className="character-count">
            {countCharacters(text).toLocaleString(language)}{" "}
            {tr(language, "characters", "caracteres")}
          </span>
          <button
            className="icon-text-button"
            type="button"
            onClick={onClear}
            disabled={!text || disabled}
            title={tr(language, "Clear text", "Limpiar texto")}
          >
            <Eraser size={15} />
            {tr(language, "Clear", "Limpiar")}
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        placeholder={tr(
          language,
          "Paste or type your text…",
          "Pegá o escribí tu texto…",
        )}
        spellCheck="true"
        autoFocus
      />
    </section>
  );
}
