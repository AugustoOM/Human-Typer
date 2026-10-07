// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import runnerSource from "../../chrome-extension/runner.js?raw";
import { createWebCompanionConfig } from "./webCompanion";

const runtime = globalThis as typeof globalThis & {
  humanTyperRun?: (config: unknown) => void;
  humanTyperLabels?: unknown;
  __humanTyperDispose?: () => void;
};
const sendMessage = vi.fn<(message: { status: string }) => Promise<void>>(() =>
  Promise.resolve(),
);
let receive: (message: unknown, sender: unknown, reply: () => void) => void;
function control(action: string) {
  receive({ type: "jobControl", id: "test-job", action }, {}, () => {});
}
function statuses() {
  return sendMessage.mock.calls.map(
    (call) => (call[0] as { status: string }).status,
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  sendMessage.mockClear();
  vi.stubGlobal("chrome", {
    runtime: {
      sendMessage,
      onMessage: {
        addListener: (listener: typeof receive) => {
          receive = listener;
        },
        removeListener: vi.fn(),
      },
    },
  });
  vi.stubGlobal(
    "Worker",
    class {
      onmessage?: () => void;
      postMessage(delay: number) {
        setTimeout(() => this.onmessage?.(), delay);
      }
      terminate() {}
    },
  );
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:test",
    revokeObjectURL: vi.fn(),
  });
  document.body.innerHTML = "<textarea></textarea>";
  document.querySelector("textarea")?.focus();
  new Function(runnerSource)();
  runtime.humanTyperRun?.({
    ...createWebCompanionConfig({
      text: "A",
      language: "es",
      baseDelayMs: 100,
      variationMs: 0,
      punctuationPauses: false,
      typingMistakes: false,
      notifyOnComplete: false,
    }),
    jobId: "test-job",
    prepared: true,
  });
});
afterEach(() => {
  runtime.__humanTyperDispose?.();
  delete runtime.__humanTyperDispose;
  delete runtime.humanTyperRun;
  delete runtime.humanTyperLabels;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("prepared extension jobs", () => {
  it("does not start before receiving control and stays cancelled at the end of countdown", async () => {
    expect(statuses()).toEqual(["prepared"]);
    control("start");
    await vi.advanceTimersByTimeAsync(2500);
    control("cancel");
    await vi.advanceTimersByTimeAsync(1000);
    expect(statuses()).toEqual(["prepared", "countdown", "cancelled"]);
    expect(document.querySelector("textarea")?.value).toBe("");
    control("start");
    expect(statuses().slice(-1)[0]).toBe("cancelled");
  });
  it("does not report completion after cancellation during the last character delay", async () => {
    control("start");
    await vi.advanceTimersByTimeAsync(3000);
    expect(document.querySelector("textarea")?.value).toBe("A");
    control("cancel");
    await vi.advanceTimersByTimeAsync(200);
    expect(statuses().slice(-1)[0]).toBe("cancelled");
    expect(statuses()).not.toContain("completed");
  });
});
