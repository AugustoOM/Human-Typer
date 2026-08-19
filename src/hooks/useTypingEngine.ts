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

  useEffect(() => {
    const unlisten = listen<TypingState>("typing-state", (event) =>
      setState(event.payload),
    );
    invoke<RuntimeInfo>("get_runtime_info")
      .then(setRuntimeInfo)
      .catch((error: unknown) => {
        setState((current) => ({
          ...current,
          status: "error",
          message: friendlyError(error),
        }));
      });
    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, []);

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

  return { state, runtimeInfo, start, togglePause, cancel };
}
