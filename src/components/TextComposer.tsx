import { Eraser, LockKeyhole } from "lucide-react";
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
        <div>
          <span className="eyebrow">CONTENIDO</span>
          <h2 id="text-heading">Tu texto</h2>
        </div>
        <div className="composer-actions">
          <span className="character-count">
            {countCharacters(text).toLocaleString("es")} caracteres
          </span>
          <button
            className="icon-text-button"
            type="button"
            onClick={onClear}
            disabled={!text || disabled}
            title="Limpiar texto"
          >
            <Eraser size={15} />
            Limpiar
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        placeholder="Pegá o escribí acá el texto que querés reproducir…"
        spellCheck="true"
        autoFocus
      />
      <div className="privacy-note">
        <LockKeyhole size={14} />
        <span>Tu texto permanece en este dispositivo y no se guarda.</span>
      </div>
    </section>
  );
}
