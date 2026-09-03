import type { LanguagePreference } from "../types";

export function tr(
  language: LanguagePreference,
  english: string,
  spanish: string,
): string {
  return language === "es" ? spanish : english;
}

export function localizeNativeMessage(
  message: string,
  language: LanguagePreference,
): string {
  if (language === "en") return message;

  const exact: Record<string, string> = {
    "Typing cancelled": "Escritura cancelada",
    "Text typed successfully": "Texto escrito correctamente",
    "Automatically paused: the target window lost focus. Return to it and press F8 to continue.":
      "Pausa automática: la ventana objetivo perdió el foco. Volvé a ella y presioná F8 para continuar.",
    "Add some text before starting.": "Agregá algún texto antes de comenzar.",
    "The base speed must be between 15 and 2000 ms.":
      "La velocidad base debe estar entre 15 y 2000 ms.",
    "Variation cannot exceed 1000 ms.":
      "La variación no puede superar 1000 ms.",
    "The countdown must be between 1 and 30 seconds.":
      "La cuenta regresiva debe estar entre 1 y 30 segundos.",
    "Target window protection is only available on macOS and Windows.":
      "La protección de ventana solo está disponible en macOS y Windows.",
    "The 8-hour safety limit was reached and typing was stopped.":
      "Se alcanzó el límite de seguridad de 8 horas y la escritura se detuvo.",
  };
  if (exact[message]) return exact[message];

  if (message.startsWith("Could not register the global shortcuts:")) {
    return message
      .replace(
        "Could not register the global shortcuts:",
        "No se pudieron registrar los atajos globales:",
      )
      .replace(
        "The app buttons remain available.",
        "Los botones de la app siguen disponibles.",
      );
  }
  if (message.startsWith("The text exceeds the ")) {
    return message
      .replace("The text exceeds the ", "El texto supera el límite de ")
      .replace(
        "-character limit. Split it into smaller sections.",
        " caracteres. Dividilo en partes más pequeñas.",
      );
  }
  if (message.startsWith("Could not start the simulated keyboard:")) {
    return message.replace(
      "Could not start the simulated keyboard:",
      "No se pudo iniciar el teclado simulado:",
    );
  }
  if (message.startsWith("Could not type a character.")) {
    return message.replace(
      "Could not type a character. Check the system permissions:",
      "No se pudo escribir un carácter. Revisá los permisos del sistema:",
    );
  }
  if (message.startsWith("Human Typer needs Accessibility permission.")) {
    return "Human Typer necesita permiso de Accesibilidad. Habilitalo en Configuración del Sistema → Privacidad y seguridad → Accesibilidad. Si ya aparece habilitado, cerrá y volvé a abrir Human Typer.";
  }
  if (message.startsWith("Could not identify the target")) {
    return "No se pudo identificar la ventana objetivo. Enfocá una ventana con un campo de texto antes de que termine la cuenta regresiva.";
  }
  return message;
}
