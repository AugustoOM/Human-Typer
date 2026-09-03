import { Languages } from "lucide-react";
import type { LanguagePreference } from "../types";

interface LanguagePickerProps {
  value: LanguagePreference;
  onChange: (language: LanguagePreference) => void;
}

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const next = value === "en" ? "es" : "en";
  return (
    <button
      className="language-button"
      type="button"
      onClick={() => onChange(next)}
      aria-label={value === "en" ? "Cambiar a español" : "Switch to English"}
      title={value === "en" ? "Español" : "English"}
    >
      <Languages size={16} />
      {value === "en" ? "ES" : "EN"}
    </button>
  );
}
