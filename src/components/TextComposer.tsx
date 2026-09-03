import { Eraser } from "lucide-react";
import { countCharacters } from "../lib/typing";

interface TextComposerProps {
  text: string;
  disabled: boolean;
  onChange: (text: string) => void;
  onClear: () => void;
}

export function TextComposer({
  text,
  disabled,
  onChange,
  onClear,
}: TextComposerProps) {
  return (
    <section className="card composer-card" aria-labelledby="text-heading">
      <div className="section-heading">
        <h2 id="text-heading">Text</h2>
        <div className="composer-actions">
          <span className="character-count">
            {countCharacters(text).toLocaleString("en")} characters
          </span>
          <button
            className="icon-text-button"
            type="button"
            onClick={onClear}
            disabled={!text || disabled}
            title="Clear text"
          >
            <Eraser size={15} />
            Clear
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        placeholder="Paste or type your text…"
        spellCheck="true"
        autoFocus
      />
    </section>
  );
}
