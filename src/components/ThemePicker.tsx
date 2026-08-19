import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "../types";

interface ThemePickerProps {
  value: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}

const themes = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
] as const;

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="theme-picker" aria-label="Tema de la aplicación">
      {themes.map(({ value: option, label, icon: Icon }) => (
        <button
          className={value === option ? "theme-button active" : "theme-button"}
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-label={`Tema ${label.toLowerCase()}`}
          title={label}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
