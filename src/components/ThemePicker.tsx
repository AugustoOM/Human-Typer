import { Monitor, Moon, Sun } from "lucide-react";
import { tr } from "../lib/i18n";
import type { LanguagePreference, ThemePreference } from "../types";

interface ThemePickerProps {
  value: ThemePreference;
  language: LanguagePreference;
  onChange: (theme: ThemePreference) => void;
}

const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function ThemePicker({ value, language, onChange }: ThemePickerProps) {
  return (
    <div
      className="theme-picker"
      aria-label={tr(language, "App theme", "Tema de la aplicación")}
    >
      {themes.map(({ value: option, label, icon: Icon }) => (
        <button
          className={value === option ? "theme-button active" : "theme-button"}
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-label={tr(
            language,
            `${label} theme`,
            `Tema ${{ System: "sistema", Light: "claro", Dark: "oscuro" }[label]}`,
          )}
          title={tr(
            language,
            label,
            { System: "Sistema", Light: "Claro", Dark: "Oscuro" }[label],
          )}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
