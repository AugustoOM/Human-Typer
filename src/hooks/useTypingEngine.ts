import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { RuntimeInfo, TypingRequest, TypingState } from "../types";

const INITIAL_STATE: TypingState = {
  status: "idle",
  current: 0,
  total: 0,
  countdown: null,
  message: null,
};

function friendlyError(error: unknown): string {
  if (typeof error === "string") return error;
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

export function useTypingEngine() {
  const [state, setState] = useState<TypingState>(INITIAL_STATE);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);

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
    const unlisten = listen<TypingState>("typing-state", (event) =>
      setState(event.payload),
    );
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
