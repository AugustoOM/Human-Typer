import runnerSource from "../../chrome-extension/runner.js?raw";
/**
 * Script / bookmarklet generator for Google Docs, Word Online, and any website.
 * Types character by character in the background even when the user switches tabs
 * or watches videos in another window.
 */

import type { FormattedRun } from "../types";

export interface WebCompanionOptions {
  formatRuns?: FormattedRun[];
  text: string;
  baseDelayMs: number;
  variationMs: number;
  punctuationPauses: boolean;
  typingMistakes: boolean;
  notifyOnComplete: boolean;
  language: "en" | "es";
}

export function generateWebCompanionScript(
  options: WebCompanionOptions,
): string {
  const jsonConfig = JSON.stringify(createWebCompanionConfig(options));

  return `(${runnerSource.split("globalThis.humanTyperLabels")[0].replace("globalThis.humanTyperRun =", "").replace(/;\s*$/, "")})(${jsonConfig});`;
}

export function createWebCompanionConfig(options: WebCompanionOptions) {
  return {
    text: options.text,
    formatRuns: options.formatRuns ?? [],
    baseDelayMs: options.baseDelayMs,
    variationMs: options.variationMs,
    punctuationPauses: options.punctuationPauses,
    typingMistakes: options.typingMistakes,
    notifyOnComplete: options.notifyOnComplete,
    labels:
      options.language === "es"
        ? {
            empty: "Human Typer: Ingresá un texto primero.",
            background: "Segundo plano",
            ready: "Listo para escribir en este documento",
            characters: "caracteres",
            start3: "Comenzar (3s)",
            pause: "Pausar",
            cancel: "Cancelar",
            notification:
              "¡Escritura finalizada con éxito! Se escribieron todos los caracteres.",
            starting: "Comenzando en",
            clickTarget: "Hacé clic donde quieras escribir",
            typing: "Escribiendo en segundo plano...",
            cancelled: "Cancelado",
            paused: "En pausa",
            completed: "¡Completado con éxito!",
            typeAgain: "Escribir de nuevo",
            resume: "Reanudar",
            typingCancelled: "Escritura cancelada",
            start: "Comenzar",
          }
        : {
            empty: "Human Typer: Please enter some text first.",
            background: "Background",
            ready: "Ready to type in this document",
            characters: "characters",
            start3: "Start (3s)",
            pause: "Pause",
            cancel: "Cancel",
            notification:
              "Typing completed successfully! All characters were typed.",
            starting: "Starting in",
            clickTarget: "Click where you want to type",
            typing: "Typing in the background...",
            cancelled: "Cancelled",
            paused: "Paused",
            completed: "Completed successfully!",
            typeAgain: "Type again",
            resume: "Resume",
            typingCancelled: "Typing cancelled",
            start: "Start",
          },
  };
}

/**
 * Returns the executable bookmarklet as a JavaScript URL.
 */
export function generateBookmarkletHref(options: WebCompanionOptions): string {
  const code = generateWebCompanionScript(options);
  return `javascript:${encodeURIComponent(code)}`;
}
