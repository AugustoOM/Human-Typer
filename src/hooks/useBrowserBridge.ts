import { useCallback, useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { WebCompanionOptions } from "../lib/webCompanion";
import { createWebCompanionConfig } from "../lib/webCompanion";
export interface BrowserBridgeState {
  pairingCode: string;
  connected: boolean;
  tabs: { id: number; title: string; url: string }[];
  job: {
    id: string;
    tabId: number;
    status: string;
    current: number;
    total: number;
    message?: string;
  } | null;
  error: string | null;
}
export function useBrowserBridge() {
  const [state, setState] = useState<BrowserBridgeState | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!isTauri()) return;
    try {
      setState(await invoke<BrowserBridgeState>("browser_bridge_state"));
    } catch (reason) {
      setError(String(reason));
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);
  const act = async (callback: () => Promise<unknown>) => {
    setError("");
    try {
      await callback();
      await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };
  return {
    state,
    error,
    send: (tabId: number, options: WebCompanionOptions) =>
      act(() =>
        invoke("send_browser_job", {
          job: {
            id: crypto.randomUUID(),
            tabId,
            config: createWebCompanionConfig(options),
          },
        }),
      ),
    control: (action: "start" | "pause" | "cancel") =>
      act(() => invoke("browser_job_control", { action })),
  };
}
