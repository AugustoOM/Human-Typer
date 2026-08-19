import { useEffect, useState } from "react";
import { loadPreferences, savePreferences } from "../lib/preferences";
import type { Preferences } from "../types";

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  function updatePreferences(patch: Partial<Preferences>) {
    setPreferences((current) => ({ ...current, ...patch }));
  }

  return { preferences, updatePreferences };
}
