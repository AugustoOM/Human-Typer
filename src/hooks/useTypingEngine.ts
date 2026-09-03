import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  playCompletionChime,
  sendDesktopNotification,
} from "../lib/soundNotification";
import type {
  Preferences,
  RuntimeInfo,
  TypingRequest,
  TypingState,
} from "../types";

const INITIAL_STATE: TypingState = {
  status: "idle",
  current: 0,
  total: 0,
  countdown: null,
  message: null,
};

function friendlyError(error: unknown): string {
  if (typeof error === "string") return error;
  if (
    typeof window !== "undefined" &&
    !(window as unknown as { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__
  ) {
    return "Estás en el navegador. Para escribir en Google Docs / páginas web, hacé clic en el botón amarillo '⚡ Segundo Plano (Docs / Web)'. El botón verde es para la aplicación de escritorio instalada de Windows.";
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

export function useTypingEngine(preferences?: Preferences) {
  const [state, setState] = useState<TypingState>(INITIAL_STATE);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const refreshRuntimeInfo = useCallback(async () => {
    try {
      setRuntimeInfo(await invoke<RuntimeInfo>("get_runtime_info"));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        message: friendlyError(error),
      }));
    }
  }, []);

  useEffect(() => {
    const unlisten = listen<TypingState>("typing-state", (event) => {
      const payload = event.payload;
      setState(payload);

      if (payload.status === "completed") {
        if (preferencesRef.current?.soundNotification ?? true) {
          playCompletionChime();
        }
        if (preferencesRef.current?.desktopNotification ?? true) {
          void sendDesktopNotification(
            "Human Typer",
            `¡Escritura completada! Se escribieron ${payload.total.toLocaleString("es")} caracteres.`,
          );
        }
      }
    });
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshRuntimeInfo();
      }
    };

    void refreshRuntimeInfo();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      void unlisten.then((dispose) => dispose());
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshRuntimeInfo]);

  const start = useCallback(async (request: TypingRequest) => {
    setState({
      status: "countdown",
      current: 0,
      total: Array.from(request.text).length,
      countdown: request.countdownSeconds,
      message: null,
    });
    try {
      await invoke("start_typing", { request });
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        countdown: null,
        message: friendlyError(error),
      }));
    }
  }, []);

  const togglePause = useCallback(async () => {
    try {
      await invoke("toggle_pause");
    } catch (error) {
      setState((current) => ({ ...current, message: friendlyError(error) }));
    }
  }, []);

  const cancel = useCallback(async () => {
    try {
      await invoke("cancel_typing");
    } catch (error) {
      setState((current) => ({ ...current, message: friendlyError(error) }));
    }
  }, []);

  const requestAccessibility = useCallback(async () => {
    try {
      await invoke<boolean>("request_accessibility");
      await refreshRuntimeInfo();
    } catch (error) {
      setState((current) => ({ ...current, message: friendlyError(error) }));
    }
  }, [refreshRuntimeInfo]);

  return {
    state,
    runtimeInfo,
    start,
    togglePause,
    cancel,
    requestAccessibility,
  };
}
